import pg from 'pg'
const { Client } = pg
const client = new Client({ connectionString: 'postgresql://postgres.algmnorpkwonyxncvbgj:csfinance37197019@aws-1-us-west-2.pooler.supabase.com:5432/postgres' })
await client.connect()

// Criar entidade PJ de teste
const { rows: [entity] } = await client.query(`
  INSERT INTO public.entities (name, type, document, owner_id)
  SELECT 'CSHUB Ltda.', 'PJ', '00.000.000/0001-00', id FROM public.profiles WHERE email = 'lourivaltpneto@outlook.com'
  RETURNING id
`)
if (!entity) { console.error('Erro'); process.exit(1) }
const entityId = entity.id

// Criar conta bancária PJ
const { rows: [bank] } = await client.query(`
  INSERT INTO public.bank_accounts (entity_id, name, bank_name, initial_balance, current_balance, color)
  VALUES ($1, 'BB Empresa', 'Banco do Brasil', 0, 0, '#0D2240')
  RETURNING id
`, [entityId])

// Copiar transações do BB para a entidade PJ (para ter dados no gráfico)
await client.query(`
  INSERT INTO public.transactions (bank_account_id, entity_id, date, description, amount, type, category_id, status, ofx_id)
  SELECT $2, $1, date, description, amount, type, category_id, status, ofx_id || '-pj'
  FROM public.transactions
  WHERE entity_id IN (SELECT id FROM public.entities WHERE type = 'PF' AND owner_id = (SELECT id FROM public.profiles WHERE email = 'lourivaltpneto@outlook.com'))
  ON CONFLICT DO NOTHING
`, [entityId, bank.id])

console.log(`✅ Entidade PJ criada: ${entityId}`)
await client.end()
