/**
 * Reforça: entidade PF visível SOMENTE pelo próprio dono.
 * Entidade PJ visível apenas por dono ou membro aceito.
 */
import pg from 'pg'
const { Client } = pg
const client = new Client({ connectionString: 'postgresql://postgres.algmnorpkwonyxncvbgj:csfinance37197019@aws-1-us-west-2.pooler.supabase.com:5432/postgres' })
await client.connect()

const sql = async (q, label) => {
  try { await client.query(q); console.log(`✅ ${label}`) }
  catch (e) { console.warn(`⚠️ ${label}: ${e.message}`) }
}

// Policy que separa PF (só dono) de PJ (dono OU membro aceito)
await sql(`DROP POLICY IF EXISTS "entities_select" ON entities`, 'drop entities_select')
await sql(`
  CREATE POLICY "entities_select" ON entities FOR SELECT
  USING (
    -- PF: APENAS o próprio dono. Ponto.
    (type = 'PF' AND owner_id = auth.uid())
    OR
    -- PJ: dono ou membro aceito
    (type = 'PJ' AND (
      owner_id = auth.uid()
      OR id IN (
        SELECT entity_id FROM entity_members
        WHERE user_id = auth.uid()
          AND accepted_at IS NOT NULL
      )
    ))
  )
`, 'entities_select: PF=só dono | PJ=dono ou membro')

// Mesma lógica para bank_accounts e transactions
await sql(`DROP POLICY IF EXISTS "bank_accounts_select" ON bank_accounts`, 'drop ba select')
await sql(`
  CREATE POLICY "bank_accounts_select" ON bank_accounts FOR SELECT
  USING (
    entity_id IN (
      SELECT id FROM entities
      WHERE (type = 'PF' AND owner_id = auth.uid())
         OR (type = 'PJ' AND (
              owner_id = auth.uid()
              OR id IN (SELECT entity_id FROM entity_members WHERE user_id = auth.uid() AND accepted_at IS NOT NULL)
            ))
    )
  )
`, 'bank_accounts_select')

await sql(`DROP POLICY IF EXISTS "transactions_select" ON transactions`, 'drop tx select')
await sql(`
  CREATE POLICY "transactions_select" ON transactions FOR SELECT
  USING (
    entity_id IN (
      SELECT id FROM entities
      WHERE (type = 'PF' AND owner_id = auth.uid())
         OR (type = 'PJ' AND (
              owner_id = auth.uid()
              OR id IN (SELECT entity_id FROM entity_members WHERE user_id = auth.uid() AND accepted_at IS NOT NULL)
            ))
    )
  )
`, 'transactions_select')

console.log('\n🔒 PF blindada: somente o dono acessa. PJ: dono ou membro convidado.')
await client.end()
