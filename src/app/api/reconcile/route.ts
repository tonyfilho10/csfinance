import { NextRequest, NextResponse } from 'next/server'
import { suggestReconciliation } from '@/services/ai/reconciliation'
import { applyRules } from '@/services/transaction-rules'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY não configurada no servidor.' },
      { status: 500 }
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  let body: { transactions: any[]; categories: any[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido' }, { status: 400 })
  }

  const { transactions, categories } = body
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return NextResponse.json([])
  }

  try {
    // 1. Aplicar regras salvas + fixas antes da IA
    const ruleMatches = await applyRules(transactions, categories)

    // 2. Separar os que já têm regra dos que precisam da IA
    const coveredIds = new Set(Object.keys(ruleMatches))
    const needAI = transactions.filter((t) => !coveredIds.has(t.id))

    // 3. Chamar IA apenas para os não cobertos
    let aiSuggestions: any[] = []
    if (needAI.length > 0) {
      aiSuggestions = await suggestReconciliation(needAI, categories)
    }

    // 4. Mesclar: regras têm prioridade sobre IA
    const ruleResults = Object.values(ruleMatches).map((r) => ({
      transaction_id: r.transactionId,
      suggested_category_id: r.categoryId,
      suggested_description: transactions.find((t) => t.id === r.transactionId)?.description ?? '',
      confidence: r.source === 'learned' ? 100 : 95,
      reasoning: r.source === 'learned' ? 'Regra aprendida de conciliação anterior' : 'Regra de negócio automática',
    }))

    return NextResponse.json([...ruleResults, ...aiSuggestions])
  } catch (err) {
    const msg = (err as Error).message ?? 'Erro desconhecido'
    console.error('[reconcile]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
