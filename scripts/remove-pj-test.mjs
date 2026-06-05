import pg from 'pg'
const { Client } = pg
const client = new Client({ connectionString: 'postgresql://postgres.algmnorpkwonyxncvbgj:csfinance37197019@aws-1-us-west-2.pooler.supabase.com:5432/postgres' })
await client.connect()
await client.query(`DELETE FROM public.entities WHERE name = 'CSHUB Ltda.' AND type = 'PJ'`)
console.log('✅ Entidade PJ de teste removida')
await client.end()
