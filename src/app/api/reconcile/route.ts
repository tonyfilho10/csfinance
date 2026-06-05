import { NextRequest, NextResponse } from 'next/server'
import { suggestReconciliation } from '@/services/ai/reconciliation'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 300 // 5 min timeout for large batches

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { transactions, categories } = await req.json()

  try {
    const suggestions = await suggestReconciliation(transactions, categories)
    return NextResponse.json(suggestions)
  } catch (err) {
    console.error('Reconciliation error:', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
