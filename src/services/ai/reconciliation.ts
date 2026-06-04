import Anthropic from '@anthropic-ai/sdk'
import type { Transaction, Category, ReconciliationSuggestion } from '@/types'

const client = new Anthropic()

export async function suggestReconciliation(
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
        content: `Você é um assistente financeiro especializado em categorização de transações bancárias brasileiras.

Categorias disponíveis (id|nome|tipo):
${categoryList}

Transações para categorizar (id|data|descrição|valor|tipo):
${transactionList}

Para cada transação, sugira:
1. A categoria mais adequada
2. Uma descrição melhorada e padronizada (em português)
3. Nível de confiança (0-100)
4. Breve justificativa

Responda SOMENTE com JSON válido no formato:
[
  {
    "transaction_id": "uuid",
    "suggested_category_id": "uuid",
    "suggested_description": "descrição melhorada",
    "confidence": 85,
    "reasoning": "justificativa curta"
  }
]`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') return []

  const jsonMatch = content.text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  return JSON.parse(jsonMatch[0]) as ReconciliationSuggestion[]
}
