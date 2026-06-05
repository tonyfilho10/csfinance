'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from './auth'
import { revalidatePath } from 'next/cache'

export async function getBankAccounts(entityId: string) {
  const user = await getSession()
  if (!user) return []
  return prisma.bankAccount.findMany({
    where: { entityId },
    orderBy: { createdAt: 'asc' },
  })
}

export async function createBankAccount(data: {
  entityId: string
  name: string
  bankName: string
  bankCode?: string
  accountNumber?: string
  agency?: string
  initialBalance: number
  color?: string
}) {
  const user = await getSession()
  if (!user) throw new Error('Não autenticado')

  const balance = data.initialBalance
  const account = await prisma.bankAccount.create({
    data: {
      entityId: data.entityId,
      name: data.name,
      bankName: data.bankName,
      bankCode: data.bankCode,
      accountNumber: data.accountNumber,
      agency: data.agency,
      initialBalance: balance,
      currentBalance: balance,
      color: data.color,
    },
  })
  revalidatePath('/banks')
  return account
}

export async function recalculateBalance(bankAccountId: string) {
  const account = await prisma.bankAccount.findUnique({
    where: { id: bankAccountId },
    include: {
      transactions: { where: { status: { not: 'ignored' } } },
    },
  })
  if (!account) return

  const balance = account.transactions.reduce((sum, t) => {
    const amount = Number(t.amount)
    return t.type === 'credit' ? sum + amount : sum - amount
  }, Number(account.initialBalance))

  await prisma.bankAccount.update({
    where: { id: bankAccountId },
    data: { currentBalance: balance },
  })
  revalidatePath('/banks')
  revalidatePath('/dashboard')
}
