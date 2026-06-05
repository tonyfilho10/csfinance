import { NextRequest, NextResponse } from 'next/server'
import { suggestReconciliation } from '@/services/ai/reconciliation'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  // Verificação rápida de configuração
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY não configurada no servidor.' },
      { status: 500 }
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  let body: { transactions: unknown[]; categories: unknown[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido' }, { status: 400 })
  }

  const { transactions, categories } = body

  if (!Array.isArray(transactions) || transactions.length === 0) {
    return NextResponse.json([], { status: 200 })
  }

  try {
    const suggestions = await suggestReconciliation(transactions as any, categories as any)
    return NextResponse.json(suggestions)
  } catch (err) {
    const msg = (err as Error).message ?? 'Erro desconhecido'
    console.error('[reconcile]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
