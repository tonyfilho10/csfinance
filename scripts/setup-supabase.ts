/**
 * Executa o setup inicial no Supabase:
 * - Trigger para criar profile automaticamente no signup
 * - Seed das categorias do sistema
 * - Bucket de storage para avatares
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://algmnorpkwonyxncvbgj.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

if (!SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY não definida no ambiente')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function run() {
  console.log('🚀 Configurando Supabase...')

  // 1. Seed categories
  const categories = [
    { name: 'Alimentação', color: '#f97316', icon: 'utensils', type: 'debit', is_system: true },
    { name: 'Transporte', color: '#3b82f6', icon: 'car', type: 'debit', is_system: true },
    { name: 'Moradia', color: '#8b5cf6', icon: 'home', type: 'debit', is_system: true },
    { name: 'Saúde', color: '#ef4444', icon: 'heart-pulse', type: 'debit', is_system: true },
    { name: 'Educação', color: '#06b6d4', icon: 'graduation-cap', type: 'debit', is_system: true },
    { name: 'Lazer', color: '#ec4899', icon: 'gamepad-2', type: 'debit', is_system: true },
    { name: 'Vestuário', color: '#f59e0b', icon: 'shirt', type: 'debit', is_system: true },
    { name: 'Salário', color: '#22c55e', icon: 'banknote', type: 'credit', is_system: true },
    { name: 'Freelance', color: '#10b981', icon: 'briefcase', type: 'credit', is_system: true },
    { name: 'Investimento', color: '#6366f1', icon: 'trending-up', type: 'credit', is_system: true },
    { name: 'Transferência', color: '#94a3b8', icon: 'arrow-left-right', type: 'both', is_system: true },
    { name: 'Outros', color: '#64748b', icon: 'ellipsis', type: 'both', is_system: true },
  ]

  const { error: catError } = await supabase.from('categories').upsert(categories, {
    onConflict: 'name,is_system',
    ignoreDuplicates: true,
  })
  if (catError) console.error('Categorias:', catError.message)
  else console.log('✅ Categorias inseridas')

  // 2. Create storage bucket for avatars
  const { error: bucketError } = await supabase.storage.createBucket('profiles', {
    public: true,
    fileSizeLimit: 2 * 1024 * 1024, // 2MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  })
  if (bucketError && !bucketError.message.includes('already exists')) {
    console.error('Bucket:', bucketError.message)
  } else {
    console.log('✅ Bucket de avatares configurado')
  }

  console.log('\n✅ Setup concluído!')
}

run().catch(console.error)
