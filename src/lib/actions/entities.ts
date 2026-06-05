'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from './auth'
import { revalidatePath } from 'next/cache'

export async function getEntities() {
  const user = await getSession()
  if (!user) return []

  return prisma.entity.findMany({
    where: {
      OR: [
        { ownerId: user.id },
        { members: { some: { userId: user.id, acceptedAt: { not: null } } } },
      ],
    },
    orderBy: { name: 'asc' },
  })
}

export async function createEntity(data: {
  name: string
  type: 'PF' | 'PJ'
  document: string
}) {
  const user = await getSession()
  if (!user) throw new Error('Não autenticado')

  const entity = await prisma.entity.create({
    data: {
      name: data.name,
      type: data.type,
      document: data.document,
      ownerId: user.id,
    },
  })
  revalidatePath('/settings')
  return entity
}

export async function getEntityMembers(entityId: string) {
  const user = await getSession()
  if (!user) return []

  return prisma.entityMember.findMany({
    where: { entityId },
    include: { profile: true },
    orderBy: { invitedAt: 'asc' },
  })
}
