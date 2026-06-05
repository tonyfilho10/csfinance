import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL não configurada')
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada. Adicione a chave "service_role" do Supabase no .env.local e no Netlify.')

  return createAdminClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user: caller } } = await supabase.auth.getUser()
  if (!caller) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const { email, password, full_name, document } = body

  const admin = getAdminClient()
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  })

  if (error) {
    const msg = error.message.includes('Invalid API key')
      ? 'Chave de serviço inválida. Verifique a SUPABASE_SERVICE_ROLE_KEY no Supabase Dashboard → Project Settings → API → service_role.'
      : error.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // Create PF entity for the new user
  await prisma.entity.create({
    data: {
      name: full_name,
      type: 'PF',
      document,
      ownerId: created.user.id,
    },
  })

  return NextResponse.json({ success: true, userId: created.user.id })
}
