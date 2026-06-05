/**
 * Regras de histórico de lançamentos.
 *
 * Lógica:
 * 1. Normaliza a descrição removendo prefixos bancários variáveis (agência, data, código)
 * 2. Mapeia padrões conhecidos para categorias fixas (regras de negócio do cliente)
 * 3. Persiste regras aprendidas nas conciliações aprovadas
 * 4. Aplica regras salvas antes de chamar a IA — economizando chamadas
 */

import { prisma } from '@/lib/prisma'

// ─── NORMALIZAÇÃO ────────────────────────────────────────────────────────────

/**
 * Remove prefixos bancários variáveis do BB e outros bancos:
 * "0000 13105 144 Pix - Enviado 29/05 ..." → "Pix - Enviado NOME"
 * "0673 70533 830 Dep dinheiro ATM ..."    → "Dep dinheiro ATM"
 */
export function normalizeDescription(desc: string): string {
  return desc
    .replace(/^\d{4}\s+\d+\s+\d+\s+/, '')      // remove "0000 13105 144 "
    .replace(/\b\d{2}\/\d{2}\s+\d{2}:\d{2}\b/g, '') // remove "29/05 09:36"
    .replace(/\b\d{2}\/\d{2}\b/g, '')            // remove "29/05"
    .replace(/\s{2,}/g, ' ')
    .trim()
    .toLowerCase()
}

// ─── REGRAS FIXAS DE NEGÓCIO ─────────────────────────────────────────────────

interface FixedRule {
  pattern: RegExp
  type: 'credit' | 'debit' | 'both'
  categoryName: string
}

const FIXED_RULES: FixedRule[] = [
  // Transferências recebidas de clientes
  { pattern: /transferência recebida|transf(er[eê]ncia)?\s+recebida|pix.*(recebido|rec\.)/i, type: 'credit', categoryName: 'Clientes' },
  { pattern: /dep\s*(dinheiro|caixa|corban|atm)/i, type: 'credit', categoryName: 'Clientes' },
  { pattern: /crédito\s+contestação/i, type: 'credit', categoryName: 'Clientes' },

  // Pix enviado para pessoa física (padrão: nome próprio ou CPF)
  { pattern: /pix.*(enviado|env\.).*([a-záéíóúâêôãõçàü]{3,}\s+[a-záéíóúâêôãõçàü]{3,})/i, type: 'debit', categoryName: 'Transferência para PF' },
  { pattern: /transf(er[eê]ncia)?\s+enviada?.*([a-záéíóúâêôãõçàü]{3,}\s+[a-záéíóúâêôãõçàü]{3,})/i, type: 'debit', categoryName: 'Transferência para PF' },

  // Tarifas bancárias
  { pattern: /tarifa|taxa\s+de\s+(manutenção|serviço|serv\.)|pacote\s+de\s+serviço|cobrança\s+referente/i, type: 'debit', categoryName: 'Tarifas' },
  { pattern: /mensalidade|anuidade/i, type: 'debit', categoryName: 'Tarifas' },

  // Impostos e tributos
  { pattern: /gnre|sefaz|receita\s+federal|simples\s+nacional|das\s+mei|irpj|csll|cofins|pis\s*\/|impostos?|tributo/i, type: 'debit', categoryName: 'Impostos' },
  { pattern: /quota|guia\s+de\s+recolhimento/i, type: 'debit', categoryName: 'Impostos' },

  // Investimentos
  { pattern: /bb\s*rf\s*cp|cdb|lci|lca|tesouro|fundo\s+de\s+invest|poupança|rendimento/i, type: 'debit', categoryName: 'Investimento' },
  { pattern: /resgate|rendimento\s+aplicação/i, type: 'credit', categoryName: 'Investimento' },

  // Pagamento de cartão (empresa)
  { pattern: /pagto?\s+(cartão|cart\.|visa|master|elo|amex)|fatura\s+cartão/i, type: 'debit', categoryName: 'Transferência' },
]

// ─── APLICAÇÃO ───────────────────────────────────────────────────────────────

export interface RuleMatch {
  transactionId: string
  categoryId: string
  categoryName: string
  source: 'fixed' | 'learned'
}

/**
 * Aplica regras (fixas + aprendidas) a um conjunto de transações pendentes.
 * Retorna as matches para pré-preencher categorias antes da IA.
 */
export async function applyRules(
  transactions: Array<{ id: string; description: string; type: string; entity_id: string }>,
  allCategories: Array<{ id: string; name: string }>
): Promise<Record<string, RuleMatch>> {
  const result: Record<string, RuleMatch> = {}
  const entityId = transactions[0]?.entity_id
  if (!entityId) return result

  // Buscar regras aprendidas desta entidade
  const learnedRules = await prisma.transactionRule.findMany({
    where: { entityId },
    include: { category: { select: { id: true, name: true } } },
  })
  const learnedMap: Record<string, { categoryId: string; categoryName: string }> = {}
  for (const r of learnedRules) {
    if (r.category) {
      learnedMap[`${r.descriptionKey}::${r.transactionType}`] = {
        categoryId: r.category.id,
        categoryName: r.category.name,
      }
    }
  }

  for (const tx of transactions) {
    const normalized = normalizeDescription(tx.description)
    const learnedKey = `${normalized}::${tx.type}`

    // 1. Regras aprendidas (maior prioridade — usuário escolheu explicitamente)
    if (learnedMap[learnedKey]) {
      result[tx.id] = {
        transactionId: tx.id,
        ...learnedMap[learnedKey],
        source: 'learned',
      }
      continue
    }

    // 2. Regras fixas de negócio
    for (const rule of FIXED_RULES) {
      if (rule.type !== 'both' && rule.type !== tx.type) continue
      if (rule.pattern.test(tx.description)) {
        const cat = allCategories.find((c) => c.name === rule.categoryName)
        if (cat) {
          result[tx.id] = {
            transactionId: tx.id,
            categoryId: cat.id,
            categoryName: cat.name,
            source: 'fixed',
          }
          break
        }
      }
    }
  }

  return result
}

// ─── APRENDIZADO ─────────────────────────────────────────────────────────────

/**
 * Salva/atualiza uma regra aprendida após conciliação aprovada.
 */
export async function saveRule(
  entityId: string,
  description: string,
  transactionType: string,
  categoryId: string | null
) {
  if (!categoryId) return
  const key = normalizeDescription(description)
  if (!key || key.length < 4) return // ignora históricos muito curtos

  await prisma.transactionRule.upsert({
    where: { entityId_descriptionKey_transactionType: { entityId, descriptionKey: key, transactionType } },
    create: { entityId, descriptionKey: key, transactionType, categoryId, hits: 1 },
    update: { categoryId, hits: { increment: 1 }, updatedAt: new Date() },
  })
}

/**
 * Salva regras em lote após aprovação da conciliação.
 */
export async function saveRulesBatch(
  updates: Array<{ entityId: string; description: string; type: string; categoryId: string | null }>
) {
  await Promise.all(updates.map((u) => saveRule(u.entityId, u.description, u.type, u.categoryId)))
}
