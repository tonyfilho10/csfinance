import pg from 'pg'
const { Client } = pg
const client = new Client({ connectionString: 'postgresql://postgres.algmnorpkwonyxncvbgj:csfinance37197019@aws-1-us-west-2.pooler.supabase.com:5432/postgres' })
await client.connect()
const { rows } = await client.query('SELECT id, name, type, document FROM public.entities ORDER BY created_at DESC LIMIT 5')
console.table(rows)
await client.end()
