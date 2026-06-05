import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { saveRulesBatch } from '@/services/transaction-rules'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { updates } = await req.json() as {
    updates: Array<{
      id: string
      entityId: string
      description: string
      type: string
      categoryId: string | null
      newDescription: string
    }>
  }

  // Atualizar transações
  const bankAccountIds = new Set<string>()
  for (const u of updates) {
    const tx = await prisma.transaction.update({
      where: { id: u.id },
      data: {
        categoryId: u.categoryId ?? null,
        description: u.newDescription,
        status: 'reconciled',
      },
    })
    bankAccountIds.add(tx.bankAccountId)
  }

  // Recalcular saldos
  for (const bankAccountId of bankAccountIds) {
    const account = await prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
      include: { transactions: { where: { status: { not: 'ignored' } } } },
    })
    if (account) {
      const balance = account.transactions.reduce((sum, t) => {
        const amount = Number(t.amount)
        return t.type === 'credit' ? sum + amount : sum - amount
      }, Number(account.initialBalance))
      await prisma.bankAccount.update({ where: { id: bankAccountId }, data: { currentBalance: balance } })
    }
  }

  // Salvar regras aprendidas para uso futuro
  await saveRulesBatch(
    updates.map((u) => ({
      entityId: u.entityId,
      description: u.description, // descrição ORIGINAL (do OFX)
      type: u.type,
      categoryId: u.categoryId,
    }))
  )

  return NextResponse.json({ approved: updates.length })
}
