import pg from 'pg'
const { Client } = pg
const client = new Client({ connectionString: 'postgresql://postgres.algmnorpkwonyxncvbgj:csfinance37197019@aws-1-us-west-2.pooler.supabase.com:5432/postgres' })
await client.connect()
console.log('Corrigindo RLS...\n')

const sql = async (q, label) => {
  try { await client.query(q); console.log(`✅ ${label}`) }
  catch (e) { console.warn(`⚠️ ${label}: ${e.message}`) }
}

// ── ENTITY_MEMBERS: policy simples sem recursão ────────────────────────────
await sql(`DROP POLICY IF EXISTS "members_select" ON entity_members`, 'drop members select')
await sql(`
  CREATE POLICY "members_select" ON entity_members FOR SELECT
  USING (user_id = auth.uid())
`, 'members_select: só ver os próprios convites')

// ── ENTITIES: sem dependência de entity_members no select básico ───────────
await sql(`DROP POLICY IF EXISTS "entities_select" ON entities`, 'drop entities select')
await sql(`
  CREATE POLICY "entities_select" ON entities FOR SELECT
  USING (
    owner_id = auth.uid()
    OR id IN (
      SELECT entity_id FROM entity_members
      WHERE user_id = auth.uid()
        AND accepted_at IS NOT NULL
    )
  )
`, 'entities_select: dono ou membro aceito')

// ── BANK_ACCOUNTS: via entidade ────────────────────────────────────────────
await sql(`DROP POLICY IF EXISTS "bank_accounts_select" ON bank_accounts`, 'drop ba select')
await sql(`
  CREATE POLICY "bank_accounts_select" ON bank_accounts FOR SELECT
  USING (
    entity_id IN (
      SELECT id FROM entities WHERE owner_id = auth.uid()
      UNION
      SELECT entity_id FROM entity_members WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  )
`, 'bank_accounts_select')

// ── TRANSACTIONS ────────────────────────────────────────────────────────────
await sql(`DROP POLICY IF EXISTS "transactions_select" ON transactions`, 'drop tx select')
await sql(`
  CREATE POLICY "transactions_select" ON transactions FOR SELECT
  USING (
    entity_id IN (
      SELECT id FROM entities WHERE owner_id = auth.uid()
      UNION
      SELECT entity_id FROM entity_members WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  )
`, 'transactions_select')
await sql(`DROP POLICY IF EXISTS "transactions_insert" ON transactions`, 'drop tx insert')
await sql(`
  CREATE POLICY "transactions_insert" ON transactions FOR INSERT
  WITH CHECK (
    entity_id IN (
      SELECT id FROM entities WHERE owner_id = auth.uid()
      UNION
      SELECT entity_id FROM entity_members WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  )
`, 'transactions_insert')
await sql(`DROP POLICY IF EXISTS "transactions_update" ON transactions`, 'drop tx update')
await sql(`
  CREATE POLICY "transactions_update" ON transactions FOR UPDATE
  USING (
    entity_id IN (
      SELECT id FROM entities WHERE owner_id = auth.uid()
      UNION
      SELECT entity_id FROM entity_members WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  )
`, 'transactions_update')
await sql(`DROP POLICY IF EXISTS "transactions_delete" ON transactions`, 'drop tx delete')
await sql(`
  CREATE POLICY "transactions_delete" ON transactions FOR DELETE
  USING (
    entity_id IN (
      SELECT id FROM entities WHERE owner_id = auth.uid()
      UNION
      SELECT entity_id FROM entity_members WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  )
`, 'transactions_delete')

// ── TRANSACTION_RULES ───────────────────────────────────────────────────────
await sql(`DROP POLICY IF EXISTS "rules_select" ON transaction_rules`, 'drop rules select')
await sql(`DROP POLICY IF EXISTS "rules_all" ON transaction_rules`, 'drop rules all')
await sql(`
  CREATE POLICY "rules_all" ON transaction_rules FOR ALL
  USING (
    entity_id IN (
      SELECT id FROM entities WHERE owner_id = auth.uid()
      UNION
      SELECT entity_id FROM entity_members WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  )
`, 'transaction_rules_all')

// ── PROFILES: permitir service role ler todos ────────────────────────────────
// (necessário para /api/admin/users que usa service role key)
// A policy atual (auth.uid() = id) já é bypass quando service_role é usado

console.log('\n✅ RLS corrigido sem recursão!')
await client.end()
