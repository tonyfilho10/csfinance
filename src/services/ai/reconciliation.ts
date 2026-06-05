import Anthropic from '@anthropic-ai/sdk'
import type { Transaction, Category, ReconciliationSuggestion } from '@/types'

const client = new Anthropic()

const BATCH_SIZE = 25

async function suggestBatch(
  transactions: Transaction[],
  categories: Category[]
): Promise<ReconciliationSuggestion[]> {
  const categoryList = categories
    .map((c) => `${c.id}|${c.name}|${c.type}`)
    .join('\n')

  const transactionList = transactions
    .map((t) => `${t.id}|${t.date}|${t.description}|${t.amount}|${t.type}`)
    .join('\n')

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `Você é um especialista em contabilidade brasileira categorizando transações bancárias.

CATEGORIAS DISPONÍVEIS (id|nome|tipo):
${categoryList}

TRANSAÇÕES (id|data|descrição|valor|tipo):
${transactionList}

REGRAS:
- "Pix - Recebido", "Dep CORBAN", "Dep dinheiro", "Transferência recebida" → Salário ou Transferência
- "Pix - Enviado", "Pagto", "TED" → categoria pelo destinatário
- "BB RF CP", "CDB", "Tesouro", "LCI", "LCA", "Poupança" → Investimento
- "Tarifa", "Taxa", "IOF", "GNRE", "Impostos", "SEFAZ", "GNRE ON LINE" → Outros
- "Salário", "Holerite" → Salário
- "Farmácia", "Médico", "Hospital", "Saúde", "Unimed" → Saúde
- "Mercado", "Supermercado", "iFood", "Rappi" → Alimentação
- "Cartão crédito" → Transferência
- Priorize tipos compatíveis (debit→tipo debit ou both, credit→tipo credit ou both)

Responda SOMENTE com JSON válido, sem texto adicional:
[{"transaction_id":"uuid","suggested_category_id":"uuid","suggested_description":"descrição melhorada em pt-BR","confidence":85,"reasoning":"justificativa curta"}]`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') return []

  const jsonMatch = content.text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  try {
    return JSON.parse(jsonMatch[0]) as ReconciliationSuggestion[]
  } catch {
    return []
  }
}

export async function suggestReconciliation(
  transactions: Transaction[],
  categories: Category[],
  onProgress?: (done: number, total: number) => void
): Promise<ReconciliationSuggestion[]> {
  const results: ReconciliationSuggestion[] = []

  for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
    const batch = transactions.slice(i, i + BATCH_SIZE)
    const batchResults = await suggestBatch(batch, categories)
    results.push(...batchResults)
    onProgress?.(Math.min(i + BATCH_SIZE, transactions.length), transactions.length)
  }

  return results
}
