import pg from 'pg'
const { Client } = pg
const client = new Client({ connectionString: 'postgresql://postgres.algmnorpkwonyxncvbgj:csfinance37197019@aws-1-us-west-2.pooler.supabase.com:5432/postgres' })
await client.connect()

const { rows: [entity] } = await client.query(`SELECT id FROM public.entities WHERE name = 'Lourival Neto' LIMIT 1`)
if (!entity) { console.error('Entidade não encontrada'); process.exit(1) }

const { rows: [acc] } = await client.query(`
  INSERT INTO public.bank_accounts (entity_id, name, bank_name, bank_code, account_number, agency, initial_balance, current_balance, color)
  VALUES ($1, 'Banco do Brasil', 'Banco do Brasil', '001', '99999999', '0999', 0, 0, '#f59e0b')
  RETURNING id
`, [entity.id])

console.log(`✅ Conta BB recriada: ${acc.id}`)
await client.end()
