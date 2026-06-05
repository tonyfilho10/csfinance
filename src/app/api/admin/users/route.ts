import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function GET() {
  // Verificar autenticação do usuário chamador
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada' }, { status: 500 })
  }

  // Admin client bypassa RLS
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Buscar todos os profiles
  const { data: profiles, error } = await admin
    .from('profiles')
    .select('id, full_name, email, avatar_url, created_at')
    .order('full_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Buscar entidades de cada usuário
  const { data: entities } = await admin
    .from('entities')
    .select('id, name, type, owner_id')

  const entityMap: Record<string, any[]> = {}
  for (const e of entities ?? []) {
    if (!entityMap[e.owner_id]) entityMap[e.owner_id] = []
    entityMap[e.owner_id].push(e)
  }

  const users = (profiles ?? []).map(p => ({
    ...p,
    entities: entityMap[p.id] ?? [],
  }))

  return NextResponse.json(users)
}
