import pg from 'pg'
const { Client } = pg
const client = new Client({ connectionString: 'postgresql://postgres.algmnorpkwonyxncvbgj:csfinance37197019@aws-1-us-west-2.pooler.supabase.com:5432/postgres' })
await client.connect()

const { rows } = await client.query(`
  SELECT e.id, e.name, e.type, e.owner_id, p.full_name as owner_name, p.email as owner_email
  FROM public.entities e
  LEFT JOIN public.profiles p ON p.id = e.owner_id
  ORDER BY e.created_at
`)
console.table(rows)
await client.end()
