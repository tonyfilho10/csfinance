/**
 * Configura Row Level Security em todas as tabelas.
 * Prisma db push cria tabelas sem RLS — este script corrige isso.
 */
import pg from 'pg'
const { Client } = pg
const client = new Client({
  connectionString: 'postgresql://postgres.algmnorpkwonyxncvbgj:csfinance37197019@aws-1-us-west-2.pooler.supabase.com:5432/postgres'
})
await client.connect()
console.log('✅ Conectado\n')

const sql = async (query, label) => {
  try {
    await client.query(query)
    console.log(`✅ ${label}`)
  } catch (e) {
    console.warn(`⚠️  ${label}: ${e.message}`)
  }
}

// ── PROFILES ──────────────────────────────────────────────────────────────────
await sql(`ALTER TABLE profiles ENABLE ROW LEVEL SECURITY`, 'RLS profiles')
await sql(`DROP POLICY IF EXISTS "profiles_select" ON profiles`, 'drop policy profiles select')
await sql(`DROP POLICY IF EXISTS "profiles_update" ON profiles`, 'drop policy profiles update')
await sql(`
  CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (auth.uid() = id)
`, 'policy profiles select (próprio perfil)')
await sql(`
  CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (auth.uid() = id)
`, 'policy profiles update')
await sql(`
  CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id)
`, 'policy profiles insert')

// ── ENTITIES ──────────────────────────────────────────────────────────────────
await sql(`ALTER TABLE entities ENABLE ROW LEVEL SECURITY`, 'RLS entities')
await sql(`DROP POLICY IF EXISTS "entities_select" ON entities`, 'drop policy entities select')
await sql(`DROP POLICY IF EXISTS "entities_insert" ON entities`, 'drop policy entities insert')
await sql(`DROP POLICY IF EXISTS "entities_update" ON entities`, 'drop policy entities update')

// SELECT: somente dono OU membro aceito
await sql(`
  CREATE POLICY "entities_select" ON entities FOR SELECT
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM entity_members m
      WHERE m.entity_id = id
        AND m.user_id = auth.uid()
        AND m.accepted_at IS NOT NULL
    )
  )
`, 'policy entities select (dono ou membro)')

await sql(`
  CREATE POLICY "entities_insert" ON entities FOR INSERT
  WITH CHECK (owner_id = auth.uid())
`, 'policy entities insert')

await sql(`
  CREATE POLICY "entities_update" ON entities FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM entity_members m
      WHERE m.entity_id = id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin')
    )
  )
`, 'policy entities update (dono ou admin)')

// ── ENTITY_MEMBERS ────────────────────────────────────────────────────────────
await sql(`ALTER TABLE entity_members ENABLE ROW LEVEL SECURITY`, 'RLS entity_members')
await sql(`DROP POLICY IF EXISTS "members_select" ON entity_members`, 'drop policy members select')
await sql(`DROP POLICY IF EXISTS "members_insert" ON entity_members`, 'drop policy members insert')
await sql(`DROP POLICY IF EXISTS "members_delete" ON entity_members`, 'drop policy members delete')

await sql(`
  CREATE POLICY "members_select" ON entity_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM entity_members m2
      WHERE m2.entity_id = entity_id
        AND m2.user_id = auth.uid()
    )
  )
`, 'policy members select')

await sql(`
  CREATE POLICY "members_insert" ON entity_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM entities e
      WHERE e.id = entity_id
        AND (
          e.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM entity_members m
            WHERE m.entity_id = e.id
              AND m.user_id = auth.uid()
              AND m.role IN ('owner', 'admin')
          )
        )
    )
  )
`, 'policy members insert (admin pode convidar)')

await sql(`
  CREATE POLICY "members_delete" ON entity_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM entities e
      WHERE e.id = entity_id
        AND (
          e.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM entity_members m
            WHERE m.entity_id = e.id
              AND m.user_id = auth.uid()
              AND m.role IN ('owner', 'admin')
          )
        )
    )
  )
`, 'policy members delete')

// ── BANK_ACCOUNTS ─────────────────────────────────────────────────────────────
await sql(`ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY`, 'RLS bank_accounts')
await sql(`DROP POLICY IF EXISTS "bank_accounts_select" ON bank_accounts`, 'drop policy bank_accounts select')
await sql(`DROP POLICY IF EXISTS "bank_accounts_insert" ON bank_accounts`, 'drop policy bank_accounts insert')
await sql(`DROP POLICY IF EXISTS "bank_accounts_update" ON bank_accounts`, 'drop policy bank_accounts update')

const bankAccessCond = `
  EXISTS (
    SELECT 1 FROM entities e
    WHERE e.id = entity_id
      AND (
        e.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM entity_members m
          WHERE m.entity_id = e.id
            AND m.user_id = auth.uid()
            AND m.accepted_at IS NOT NULL
        )
      )
  )
`
await sql(`CREATE POLICY "bank_accounts_select" ON bank_accounts FOR SELECT USING (${bankAccessCond})`, 'policy bank_accounts select')
await sql(`CREATE POLICY "bank_accounts_insert" ON bank_accounts FOR INSERT WITH CHECK (${bankAccessCond})`, 'policy bank_accounts insert')
await sql(`CREATE POLICY "bank_accounts_update" ON bank_accounts FOR UPDATE USING (${bankAccessCond})`, 'policy bank_accounts update')
await sql(`CREATE POLICY "bank_accounts_delete" ON bank_accounts FOR DELETE USING (${bankAccessCond})`, 'policy bank_accounts delete')

// ── TRANSACTIONS ──────────────────────────────────────────────────────────────
await sql(`ALTER TABLE transactions ENABLE ROW LEVEL SECURITY`, 'RLS transactions')
await sql(`DROP POLICY IF EXISTS "transactions_select" ON transactions`, 'drop policy transactions select')
await sql(`DROP POLICY IF EXISTS "transactions_insert" ON transactions`, 'drop policy transactions insert')
await sql(`DROP POLICY IF EXISTS "transactions_update" ON transactions`, 'drop policy transactions update')
await sql(`DROP POLICY IF EXISTS "transactions_delete" ON transactions`, 'drop policy transactions delete')

const txAccessCond = `
  EXISTS (
    SELECT 1 FROM entities e
    WHERE e.id = entity_id
      AND (
        e.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM entity_members m
          WHERE m.entity_id = e.id
            AND m.user_id = auth.uid()
            AND m.accepted_at IS NOT NULL
        )
      )
  )
`
await sql(`CREATE POLICY "transactions_select" ON transactions FOR SELECT USING (${txAccessCond})`, 'policy transactions select')
await sql(`CREATE POLICY "transactions_insert" ON transactions FOR INSERT WITH CHECK (${txAccessCond})`, 'policy transactions insert')
await sql(`CREATE POLICY "transactions_update" ON transactions FOR UPDATE USING (${txAccessCond})`, 'policy transactions update')
await sql(`CREATE POLICY "transactions_delete" ON transactions FOR DELETE USING (${txAccessCond})`, 'policy transactions delete')

// ── CATEGORIES ────────────────────────────────────────────────────────────────
await sql(`ALTER TABLE categories ENABLE ROW LEVEL SECURITY`, 'RLS categories')
await sql(`DROP POLICY IF EXISTS "categories_select" ON categories`, 'drop policy categories select')
await sql(`
  CREATE POLICY "categories_select" ON categories FOR SELECT
  USING (
    is_system = true
    OR entity_id IS NULL
    OR EXISTS (
      SELECT 1 FROM entities e
      WHERE e.id = entity_id
        AND (
          e.owner_id = auth.uid()
          OR EXISTS (SELECT 1 FROM entity_members m WHERE m.entity_id = e.id AND m.user_id = auth.uid())
        )
    )
  )
`, 'policy categories select')

// ── TRANSACTION_RULES ─────────────────────────────────────────────────────────
await sql(`ALTER TABLE transaction_rules ENABLE ROW LEVEL SECURITY`, 'RLS transaction_rules')
await sql(`DROP POLICY IF EXISTS "rules_select" ON transaction_rules`, 'drop policy rules select')
await sql(`DROP POLICY IF EXISTS "rules_all" ON transaction_rules`, 'drop policy rules all')
await sql(`
  CREATE POLICY "rules_select" ON transaction_rules FOR SELECT
  USING (${txAccessCond.replace(/entity_id/g, 'entity_id')})
`, 'policy transaction_rules select')
await sql(`
  CREATE POLICY "rules_all" ON transaction_rules FOR ALL
  USING (${txAccessCond})
`, 'policy transaction_rules all')

console.log('\n🔒 RLS configurado com sucesso!')
console.log('Regras aplicadas:')
console.log('  • PF: apenas o dono vê sua entidade')
console.log('  • PJ: apenas membros aceitos têm acesso')
console.log('  • Convidar para PJ: somente owner/admin')
await client.end()
