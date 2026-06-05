import Anthropic from '@anthropic-ai/sdk'
import type { Transaction, Category, ReconciliationSuggestion } from '@/types'

const client = new Anthropic()

// Haiku = muito mais rápido → cabe no timeout de 10s da Netlify (plano free)
// Sonnet só se o plano suportar funções com >26s
const MODEL = 'claude-haiku-4-5'

// 3 transações → ~2s com Haiku → margem confortável no limite de 10s Netlify free
const BATCH_SIZE = 3

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

REGRAS DE NEGÓCIO (sempre aplicar):
- Transferência recebida / Dep CORBAN / Dep dinheiro / Pix recebido de CNPJ → Clientes
- Pix enviado + NOME DE PESSOA FÍSICA → Transferência para PF
- Tarifa / Taxa de serviço / Pacote de serviços / Mensalidade bancária → Tarifas
- GNRE / SEFAZ / Imposto / Impostos / Quota / Simples / DAS → Impostos
- BB RF CP / CDB / LCI / LCA / Tesouro / Poupança → Investimento
- Pagamento cartão crédito / Fatura → Transferência
- iFood / Mercado / Supermercado / Restaurante / Padaria → Alimentação
- Salário / Holerite → Salário
- Farmácia / Médico / Hospital / Plano de saúde / Unimed → Saúde
- Posto / Uber / 99 / Combustível → Transporte
- Aluguel / Condomínio / Energia / Água / Internet → Moradia
- Escola / Faculdade / Curso / MBA → Educação

TRANSAÇÕES (id|data|descrição|valor|tipo):
${transactionList}

JSON esperado (sem texto fora do JSON):
[{"transaction_id":"uuid","suggested_category_id":"uuid","suggested_description":"descrição limpa pt-BR","confidence":90,"reasoning":"1 frase"}]`,
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
