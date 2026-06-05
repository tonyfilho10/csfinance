import pg from 'pg'

const { Client } = pg
const client = new Client({
  connectionString: 'postgresql://postgres.algmnorpkwonyxncvbgj:csfinance37197019@aws-1-us-west-2.pooler.supabase.com:5432/postgres'
})

await client.connect()
console.log('✅ Conectado')

// Buscar entidade e categorias
const { rows: [entity] } = await client.query(
  `SELECT id FROM public.entities WHERE name = 'Lourival Neto' LIMIT 1`
)
if (!entity) { console.error('Entidade não encontrada'); process.exit(1) }
const entityId = entity.id

const { rows: cats } = await client.query(
  `SELECT id, name FROM public.categories WHERE is_system = true`
)
const cat = Object.fromEntries(cats.map(c => [c.name, c.id]))

// Criar conta bancária Nubank
const { rows: [nubank] } = await client.query(`
  INSERT INTO public.bank_accounts (entity_id, name, bank_name, bank_code, initial_balance, current_balance, color)
  VALUES ($1, 'Nubank', 'Nubank', '260', 3500.00, 3500.00, '#8b5cf6')
  ON CONFLICT DO NOTHING
  RETURNING id
`, [entityId])

const { rows: [itau] } = await client.query(`
  INSERT INTO public.bank_accounts (entity_id, name, bank_name, bank_code, initial_balance, current_balance, color)
  VALUES ($1, 'Itaú Corrente', 'Itaú', '341', 8000.00, 8000.00, '#f59e0b')
  ON CONFLICT DO NOTHING
  RETURNING id
`, [entityId])

if (!nubank || !itau) {
  // Buscar se já existem
  const { rows: existing } = await client.query(
    `SELECT id, name FROM public.bank_accounts WHERE entity_id = $1`, [entityId]
  )
  console.log('Contas existentes:', existing.map(b => b.name).join(', '))
  console.log('Pulando seed de transações...')
  await client.end()
  process.exit(0)
}

const nubankId = nubank.id
const itauId = itau.id

// Gerar transações dos últimos 3 meses
function date(daysAgo) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

const transactions = [
  // === NUBANK — Junho ===
  { bank: nubankId, date: date(1),  desc: 'Salário CSHUB', amount: 8500, type: 'credit', cat: cat['Salário'] },
  { bank: nubankId, date: date(2),  desc: 'iFood - Refeição', amount: 45.90, type: 'debit', cat: cat['Alimentação'] },
  { bank: nubankId, date: date(3),  desc: 'Uber', amount: 28.50, type: 'debit', cat: cat['Transporte'] },
  { bank: nubankId, date: date(4),  desc: 'Mercado Municipal', amount: 187.30, type: 'debit', cat: cat['Alimentação'] },
  { bank: nubankId, date: date(4),  desc: 'Netflix', amount: 39.90, type: 'debit', cat: cat['Lazer'] },
  { bank: nubankId, date: date(5),  desc: 'Farmácia São João', amount: 62.00, type: 'debit', cat: cat['Saúde'] },
  { bank: nubankId, date: date(6),  desc: 'Freelance Design', amount: 1200, type: 'credit', cat: cat['Freelance'] },
  { bank: nubankId, date: date(7),  desc: 'Posto Shell', amount: 150.00, type: 'debit', cat: cat['Transporte'] },
  { bank: nubankId, date: date(8),  desc: 'Rappi - Pedido', amount: 78.60, type: 'debit', cat: cat['Alimentação'] },
  { bank: nubankId, date: date(9),  desc: 'Spotify Premium', amount: 21.90, type: 'debit', cat: cat['Lazer'] },
  { bank: nubankId, date: date(10), desc: 'Shopping Iguatemi', amount: 349.00, type: 'debit', cat: cat['Vestuário'] },
  { bank: nubankId, date: date(11), desc: 'Dentista Dr. Lima', amount: 250.00, type: 'debit', cat: cat['Saúde'] },
  { bank: nubankId, date: date(12), desc: 'Padaria Central', amount: 34.50, type: 'debit', cat: cat['Alimentação'] },
  { bank: nubankId, date: date(13), desc: 'Amazon Prime', amount: 19.90, type: 'debit', cat: cat['Lazer'] },

  // === ITAÚ — Junho ===
  { bank: itauId, date: date(1),  desc: 'Aluguel Apto 502', amount: 1800, type: 'debit', cat: cat['Moradia'] },
  { bank: itauId, date: date(3),  desc: 'Condomínio', amount: 420, type: 'debit', cat: cat['Moradia'] },
  { bank: itauId, date: date(5),  desc: 'ENEL Energia', amount: 187.40, type: 'debit', cat: cat['Moradia'] },
  { bank: itauId, date: date(7),  desc: 'Plano de Saúde Unimed', amount: 498.00, type: 'debit', cat: cat['Saúde'] },
  { bank: itauId, date: date(9),  desc: 'Rendimento Poupança', amount: 92.30, type: 'credit', cat: cat['Investimento'] },
  { bank: itauId, date: date(11), desc: 'Transferência para Nubank', amount: 500, type: 'debit', cat: cat['Transferência'] },
  { bank: itauId, date: date(13), desc: 'Curso Inglês CNA', amount: 320.00, type: 'debit', cat: cat['Educação'] },
  { bank: itauId, date: date(15), desc: 'Supermercado Extra', amount: 412.80, type: 'debit', cat: cat['Alimentação'] },

  // === Maio (30-60 dias atrás) ===
  { bank: nubankId, date: date(32), desc: 'Salário CSHUB', amount: 8500, type: 'credit', cat: cat['Salário'] },
  { bank: nubankId, date: date(33), desc: 'Freelance App Mobile', amount: 2500, type: 'credit', cat: cat['Freelance'] },
  { bank: nubankId, date: date(34), desc: 'iFood - Almoço', amount: 52.00, type: 'debit', cat: cat['Alimentação'] },
  { bank: nubankId, date: date(35), desc: 'Uber Eats', amount: 67.40, type: 'debit', cat: cat['Alimentação'] },
  { bank: nubankId, date: date(36), desc: 'Cinema Cinemark', amount: 88.00, type: 'debit', cat: cat['Lazer'] },
  { bank: nubankId, date: date(37), desc: 'Posto BR', amount: 200.00, type: 'debit', cat: cat['Transporte'] },
  { bank: nubankId, date: date(38), desc: 'Farmácia Drogasil', amount: 43.90, type: 'debit', cat: cat['Saúde'] },
  { bank: nubankId, date: date(40), desc: 'Renner Roupas', amount: 289.90, type: 'debit', cat: cat['Vestuário'] },
  { bank: nubankId, date: date(42), desc: 'Padaria Pão de Açúcar', amount: 41.20, type: 'debit', cat: cat['Alimentação'] },
  { bank: nubankId, date: date(45), desc: 'Mercado Lins', amount: 203.60, type: 'debit', cat: cat['Alimentação'] },
  { bank: itauId, date: date(32), desc: 'Aluguel Apto 502', amount: 1800, type: 'debit', cat: cat['Moradia'] },
  { bank: itauId, date: date(33), desc: 'Condomínio', amount: 420, type: 'debit', cat: cat['Moradia'] },
  { bank: itauId, date: date(34), desc: 'SABESP Água', amount: 89.60, type: 'debit', cat: cat['Moradia'] },
  { bank: itauId, date: date(35), desc: 'Plano de Saúde Unimed', amount: 498.00, type: 'debit', cat: cat['Saúde'] },
  { bank: itauId, date: date(37), desc: 'Pós-graduação MBA', amount: 890.00, type: 'debit', cat: cat['Educação'] },
  { bank: itauId, date: date(40), desc: 'Rendimento CDB', amount: 245.70, type: 'credit', cat: cat['Investimento'] },
  { bank: itauId, date: date(45), desc: 'Supermercado Carrefour', amount: 378.50, type: 'debit', cat: cat['Alimentação'] },
  { bank: itauId, date: date(48), desc: 'Claro Internet', amount: 99.90, type: 'debit', cat: cat['Moradia'] },

  // === Abril (60-90 dias atrás) ===
  { bank: nubankId, date: date(62), desc: 'Salário CSHUB', amount: 8500, type: 'credit', cat: cat['Salário'] },
  { bank: nubankId, date: date(63), desc: 'Freelance UI/UX', amount: 1800, type: 'credit', cat: cat['Freelance'] },
  { bank: nubankId, date: date(64), desc: 'iFood - Jantar', amount: 89.00, type: 'debit', cat: cat['Alimentação'] },
  { bank: nubankId, date: date(65), desc: '99 Táxi', amount: 45.60, type: 'debit', cat: cat['Transporte'] },
  { bank: nubankId, date: date(67), desc: 'Show Ivete Sangalo', amount: 280.00, type: 'debit', cat: cat['Lazer'] },
  { bank: nubankId, date: date(68), desc: 'Farmácia Pacheco', amount: 95.30, type: 'debit', cat: cat['Saúde'] },
  { bank: nubankId, date: date(70), desc: 'C&A Roupas', amount: 445.00, type: 'debit', cat: cat['Vestuário'] },
  { bank: nubankId, date: date(72), desc: 'Restaurante Madero', amount: 156.80, type: 'debit', cat: cat['Alimentação'] },
  { bank: nubankId, date: date(74), desc: 'Steam - Jogos', amount: 79.90, type: 'debit', cat: cat['Lazer'] },
  { bank: nubankId, date: date(76), desc: 'Panifidoro Padaria', amount: 38.70, type: 'debit', cat: cat['Alimentação'] },
  { bank: nubankId, date: date(78), desc: 'Posto Ipiranga', amount: 180.00, type: 'debit', cat: cat['Transporte'] },
  { bank: itauId, date: date(62), desc: 'Aluguel Apto 502', amount: 1800, type: 'debit', cat: cat['Moradia'] },
  { bank: itauId, date: date(63), desc: 'Condomínio', amount: 420, type: 'debit', cat: cat['Moradia'] },
  { bank: itauId, date: date(65), desc: 'ENEL Energia', amount: 211.30, type: 'debit', cat: cat['Moradia'] },
  { bank: itauId, date: date(66), desc: 'Plano de Saúde Unimed', amount: 498.00, type: 'debit', cat: cat['Saúde'] },
  { bank: itauId, date: date(68), desc: 'Pós-graduação MBA', amount: 890.00, type: 'debit', cat: cat['Educação'] },
  { bank: itauId, date: date(70), desc: 'Rendimento Tesouro Direto', amount: 315.40, type: 'credit', cat: cat['Investimento'] },
  { bank: itauId, date: date(72), desc: 'Supermercado Pão de Açúcar', amount: 521.90, type: 'debit', cat: cat['Alimentação'] },
  { bank: itauId, date: date(75), desc: 'Claro Internet', amount: 99.90, type: 'debit', cat: cat['Moradia'] },
  { bank: itauId, date: date(78), desc: 'Escola Inglês', amount: 320.00, type: 'debit', cat: cat['Educação'] },
]

let inserted = 0
for (const t of transactions) {
  await client.query(`
    INSERT INTO public.transactions (bank_account_id, entity_id, date, description, amount, type, category_id, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'reconciled')
    ON CONFLICT DO NOTHING
  `, [t.bank, entityId, t.date, t.desc, t.amount, t.type, t.cat])
  inserted++
}

// Recalcular saldos
for (const bankId of [nubankId, itauId]) {
  const { rows: [acc] } = await client.query(
    `SELECT initial_balance FROM public.bank_accounts WHERE id = $1`, [bankId]
  )
  const { rows: [{ total }] } = await client.query(`
    SELECT COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END), 0) as total
    FROM public.transactions WHERE bank_account_id = $1 AND status != 'ignored'
  `, [bankId])
  const balance = parseFloat(acc.initial_balance) + parseFloat(total)
  await client.query(
    `UPDATE public.bank_accounts SET current_balance = $1 WHERE id = $2`, [balance, bankId]
  )
}

console.log(`✅ ${inserted} transações inseridas!`)
console.log('✅ Saldos recalculados')
await client.end()
