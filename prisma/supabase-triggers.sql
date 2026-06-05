-- Execute este SQL no editor SQL do Supabase Dashboard

-- 1. Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Trigger para criar perfil automaticamente no signup
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Seed categorias do sistema
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
ON CONFLICT DO NOTHING;
