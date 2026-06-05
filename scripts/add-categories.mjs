import pg from 'pg'
const { Client } = pg
const client = new Client({ connectionString: 'postgresql://postgres.algmnorpkwonyxncvbgj:csfinance37197019@aws-1-us-west-2.pooler.supabase.com:5432/postgres' })
await client.connect()

// Novas categorias de negócio
const newCats = [
  { name: 'Clientes',            color: '#0ea5e9', icon: 'users',          type: 'credit', is_system: true },
  { name: 'Tarifas',             color: '#78716c', icon: 'landmark',        type: 'debit',  is_system: true },
  { name: 'Impostos',            color: '#dc2626', icon: 'file-text',       type: 'debit',  is_system: true },
  { name: 'Transferência para PF', color: '#a855f7', icon: 'user-round-check', type: 'debit', is_system: true },
]

for (const cat of newCats) {
  await client.query(`
    INSERT INTO public.categories (name, color, icon, type, is_system)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT DO NOTHING
  `, [cat.name, cat.color, cat.icon, cat.type, cat.is_system])
  console.log(`✅ ${cat.name}`)
}

// Criar tabela de regras de histórico
await client.query(`
  CREATE TABLE IF NOT EXISTS public.transaction_rules (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id uuid REFERENCES public.entities ON DELETE CASCADE NOT NULL,
    description_key text NOT NULL,
    transaction_type text NOT NULL CHECK (transaction_type IN ('credit', 'debit')),
    category_id uuid REFERENCES public.categories,
    hits integer DEFAULT 1,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE (entity_id, description_key, transaction_type)
  )
`)
console.log('✅ Tabela transaction_rules criada')

// Index para busca rápida
await client.query(`
  CREATE INDEX IF NOT EXISTS idx_transaction_rules_lookup
  ON public.transaction_rules (entity_id, description_key, transaction_type)
`)
console.log('✅ Index criado')
await client.end()
console.log('\n🎉 Setup concluído!')
