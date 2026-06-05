import pg from 'pg'
const { Client } = pg
const client = new Client({ connectionString: 'postgresql://postgres.algmnorpkwonyxncvbgj:csfinance37197019@aws-1-us-west-2.pooler.supabase.com:5432/postgres' })
await client.connect()

// Deletar todas as transações
const { rowCount: txDeleted } = await client.query(`DELETE FROM public.transactions WHERE entity_id IN (SELECT id FROM public.entities WHERE name = 'Lourival Neto')`)
console.log(`✅ ${txDeleted} transações removidas`)

// Deletar todas as contas bancárias fictícias
const { rowCount: bankDeleted } = await client.query(`DELETE FROM public.bank_accounts WHERE entity_id IN (SELECT id FROM public.entities WHERE name = 'Lourival Neto')`)
console.log(`✅ ${bankDeleted} contas bancárias removidas`)

await client.end()
console.log('🧹 Dados fictícios limpos!')
