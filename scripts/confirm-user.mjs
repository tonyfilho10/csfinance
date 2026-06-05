import pg from 'pg'

const { Client } = pg
const client = new Client({
  connectionString: 'postgresql://postgres.algmnorpkwonyxncvbgj:csfinance37197019@aws-1-us-west-2.pooler.supabase.com:5432/postgres'
})

await client.connect()

const email = 'lourivaltpneto@outlook.com'

const res = await client.query(
  `UPDATE auth.users SET email_confirmed_at = now(), updated_at = now() WHERE email = $1 RETURNING id, email`,
  [email]
)

if (res.rows.length > 0) {
  console.log(`✅ E-mail confirmado para: ${res.rows[0].email} (id: ${res.rows[0].id})`)
} else {
  console.log('❌ Usuário não encontrado')
}

await client.end()
