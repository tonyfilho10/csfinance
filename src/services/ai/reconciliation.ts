import Anthropic from '@anthropic-ai/sdk'
import type { Transaction, Category, ReconciliationSuggestion } from '@/types'

const client = new Anthropic()

// Haiku = muito mais rápido → cabe no timeout de 10s da Netlify (plano free)
// Sonnet só se o plano suportar funções com >26s
const MODEL = 'claude-haiku-4-5'

// Máx por batch: 10 no free plan (10s), pode subir para 20 no Pro (26s)
const BATCH_SIZE = 10

async function suggestBatch(
  transactions: Transaction[],
  categories: Category[]
): Promise<ReconciliationSuggestion[]> {
  // Apenas categorias compatíveis com o tipo das transações do batch
  const hasCredit = transactions.some((t) => t.type === 'credit')
  const hasDebit  = transactions.some((t) => t.type === 'debit')
  const filteredCats = categories.filter((c) =>
    c.type === 'both' ||
    (hasCredit && c.type === 'credit') ||
    (hasDebit  && c.type === 'debit')
  )

  const categoryList = filteredCats.map((c) => `${c.id}|${c.name}`).join('\n')

  const transactionList = transactions
    .map((t) => `${t.id}|${t.date}|${t.description}|${t.amount}|${t.type}`)
    .join('\n')

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `Categorize transações bancárias brasileiras. Responda SOMENTE com JSON.

CATEGORIAS (id|nome):
${categoryList}

REGRAS RÁPIDAS:
- BB RF CP / CDB / LCI / Tesouro / Poupança → Investimento
- iFood / Mercado / Supermercado / Padaria → Alimentação
- Pix enviado / TED / Pagto → Transferência (se pessoa) ou pelo contexto
- Salário / Holerite → Salário
- GNRE / Impostos / SEFAZ / Tarifa / Taxa → Outros
- Farmácia / Médico / Plano → Saúde
- Posto / Uber / 99 → Transporte
- Aluguel / Condomínio / Energia / Água / Internet → Moradia

TRANSAÇÕES (id|data|descrição|valor|tipo):
${transactionList}

JSON esperado (array):
[{"transaction_id":"uuid","suggested_category_id":"uuid","suggested_description":"descrição em pt-BR","confidence":90,"reasoning":"motivo curto"}]`,
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
