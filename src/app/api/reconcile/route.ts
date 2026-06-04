import { NextRequest, NextResponse } from 'next/server'
import { suggestReconciliation } from '@/services/ai/reconciliation'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { transactions, categories } = await req.json()
  const suggestions = await suggestReconciliation(transactions, categories)
  return NextResponse.json(suggestions)
}
