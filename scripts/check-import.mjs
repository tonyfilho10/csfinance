import pg from 'pg'
const { Client } = pg
const client = new Client({ connectionString: 'postgresql://postgres.algmnorpkwonyxncvbgj:csfinance37197019@aws-1-us-west-2.pooler.supabase.com:5432/postgres' })
await client.connect()

const { rows } = await client.query(`
  SELECT
    COUNT(*) as total,
    SUM(CASE WHEN type = 'credit' THEN 1 ELSE 0 END) as entradas,
    SUM(CASE WHEN type = 'debit'  THEN 1 ELSE 0 END) as saidas,
    SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) as total_entradas,
    SUM(CASE WHEN type = 'debit'  THEN amount ELSE 0 END) as total_saidas
  FROM public.transactions
`)
console.table(rows)
await client.end()
