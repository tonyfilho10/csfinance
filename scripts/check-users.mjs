import pg from 'pg'
const { Client } = pg
const client = new Client({ connectionString: 'postgresql://postgres.algmnorpkwonyxncvbgj:csfinance37197019@aws-1-us-west-2.pooler.supabase.com:5432/postgres' })
await client.connect()

const { rows: profiles } = await client.query('SELECT id, full_name, email, created_at FROM public.profiles ORDER BY full_name')
console.log(`\n📋 Profiles (${profiles.length}):`)
console.table(profiles)

const { rows: authUsers } = await client.query('SELECT id, email, created_at FROM auth.users ORDER BY email')
console.log(`\n🔐 Auth users (${authUsers.length}):`)
console.table(authUsers)

await client.end()
