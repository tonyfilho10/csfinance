'use server'

import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getSession() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getProfile() {
  const user = await getSession()
  if (!user) return null
  return prisma.profile.findUnique({ where: { id: user.id } })
}

export async function updateProfile(data: { fullName: string }) {
  const user = await getSession()
  if (!user) throw new Error('Não autenticado')

  await prisma.profile.update({
    where: { id: user.id },
    data: { fullName: data.fullName },
  })
  revalidatePath('/settings')
}

export async function updateAvatar(avatarUrl: string) {
  const user = await getSession()
  if (!user) throw new Error('Não autenticado')

  await prisma.profile.update({
    where: { id: user.id },
    data: { avatarUrl },
  })
  revalidatePath('/', 'layout')
}
