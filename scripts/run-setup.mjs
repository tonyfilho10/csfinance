import pg from 'pg'

const { Client } = pg

const client = new Client({
  connectionString: 'postgresql://postgres.algmnorpkwonyxncvbgj:csfinance37197019@aws-1-us-west-2.pooler.supabase.com:5432/postgres'
})

await client.connect()
console.log('✅ Conectado ao banco')

// Trigger para criar perfil automaticamente
await client.query(`
  CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  BEGIN
    INSERT INTO public.profiles (id, full_name, email)
    VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
      new.email
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
  END;
  $$;
`)
console.log('✅ Função handle_new_user criada')

await client.query(`DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users`)
await client.query(`
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user()
`)
console.log('✅ Trigger on_auth_user_created criado')

// Seed categorias
await client.query(`
  INSERT INTO public.categories (name, color, icon, type, is_system) VALUES
    ('Alimentação', '#f97316', 'utensils', 'debit', true),
    ('Transporte',  '#3b82f6', 'car', 'debit', true),
    ('Moradia',     '#8b5cf6', 'home', 'debit', true),
    ('Saúde',       '#ef4444', 'heart-pulse', 'debit', true),
    ('Educação',    '#06b6d4', 'graduation-cap', 'debit', true),
    ('Lazer',       '#ec4899', 'gamepad-2', 'debit', true),
    ('Vestuário',   '#f59e0b', 'shirt', 'debit', true),
    ('Salário',     '#22c55e', 'banknote', 'credit', true),
    ('Freelance',   '#10b981', 'briefcase', 'credit', true),
    ('Investimento','#6366f1', 'trending-up', 'credit', true),
    ('Transferência','#94a3b8','arrow-left-right', 'both', true),
    ('Outros',      '#64748b', 'ellipsis', 'both', true)
  ON CONFLICT DO NOTHING
`)
console.log('✅ Categorias seed inseridas')

await client.end()
console.log('\n🎉 Setup completo!')
