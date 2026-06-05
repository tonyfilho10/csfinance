'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from './auth'
import { recalculateBalance } from './banks'
import { revalidatePath } from 'next/cache'

export async function importTransactions(
  bankAccountId: string,
  entityId: string,
  transactions: Array<{
    date: string
    description: string
    amount: number
    type: 'credit' | 'debit'
    ofxId?: string
  }>
) {
  const user = await getSession()
  if (!user) throw new Error('Não autenticado')

  let imported = 0
  for (const t of transactions) {
    const existing = t.ofxId
      ? await prisma.transaction.findFirst({
          where: { bankAccountId, ofxId: t.ofxId },
        })
      : null

    if (!existing) {
      await prisma.transaction.create({
        data: {
          bankAccountId,
          entityId,
          date: new Date(t.date),
          description: t.description,
          amount: t.amount,
          type: t.type,
          ofxId: t.ofxId,
          status: 'pending',
        },
      })
      imported++
    }
  }

  await recalculateBalance(bankAccountId)
  revalidatePath('/transactions')
  revalidatePath('/reconciliation')
  return imported
}

export async function getPendingTransactions(entityId: string) {
  const user = await getSession()
  if (!user) return []

  return prisma.transaction.findMany({
    where: { entityId, status: 'pending' },
    include: { category: true, bankAccount: true },
    orderBy: { date: 'desc' },
    take: 100,
  })
}

export async function approveReconciliation(
  updates: Array<{
    id: string
    categoryId?: string
    description: string
  }>
) {
  const user = await getSession()
  if (!user) throw new Error('Não autenticado')

  const bankAccountIds = new Set<string>()

  for (const u of updates) {
    const tx = await prisma.transaction.update({
      where: { id: u.id },
      data: {
        categoryId: u.categoryId ?? null,
        description: u.description,
        status: 'reconciled',
      },
    })
    bankAccountIds.add(tx.bankAccountId)
  }

  for (const id of bankAccountIds) {
    await recalculateBalance(id)
  }

  revalidatePath('/reconciliation')
  revalidatePath('/dashboard')
}

export async function getTransactions(params: {
  entityId: string
  bankAccountId?: string
  status?: string
  dateStart?: string
  dateEnd?: string
}) {
  const user = await getSession()
  if (!user) return []

  return prisma.transaction.findMany({
    where: {
      entityId: params.entityId,
      ...(params.bankAccountId ? { bankAccountId: params.bankAccountId } : {}),
      ...(params.status && params.status !== 'all' ? { status: params.status as any } : {}),
      ...(params.dateStart ? { date: { gte: new Date(params.dateStart) } } : {}),
      ...(params.dateEnd ? { date: { lte: new Date(params.dateEnd) } } : {}),
    },
    include: { category: true, bankAccount: true },
    orderBy: { date: 'desc' },
    take: 200,
  })
}

export async function getCategories() {
  return prisma.category.findMany({
    where: { isSystem: true },
    orderBy: { name: 'asc' },
  })
}
