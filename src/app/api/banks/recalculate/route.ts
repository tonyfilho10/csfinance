import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { bankAccountId } = await req.json()

  const account = await prisma.bankAccount.findUnique({
    where: { id: bankAccountId },
    include: { transactions: { where: { status: { not: 'ignored' } } } },
  })
  if (!account) return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })

  const balance = account.transactions.reduce((sum, t) => {
    const amount = Number(t.amount)
    return t.type === 'credit' ? sum + amount : sum - amount
  }, Number(account.initialBalance))

  await prisma.bankAccount.update({
    where: { id: bankAccountId },
    data: { currentBalance: balance },
  })

  return NextResponse.json({ balance })
}
