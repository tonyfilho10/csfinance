import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { name, document, admin_email } = await req.json()

  // Find admin user by email
  const adminProfile = await prisma.profile.findFirst({ where: { email: admin_email } })
  if (!adminProfile) {
    return NextResponse.json({ error: 'Usuário administrador não encontrado. Crie a conta primeiro.' }, { status: 404 })
  }

  const entity = await prisma.entity.create({
    data: {
      name,
      type: 'PJ',
      document,
      ownerId: adminProfile.id,
    },
  })

  return NextResponse.json({ success: true, entityId: entity.id })
}
