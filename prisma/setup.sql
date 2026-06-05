-- Enable uuid extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Seed system categories (idempotent)
INSERT INTO categories (name, color, icon, type, is_system) VALUES
  ('Alimentação', '#f97316', 'utensils', 'debit', true),
  ('Transporte', '#3b82f6', 'car', 'debit', true),
  ('Moradia', '#8b5cf6', 'home', 'debit', true),
  ('Saúde', '#ef4444', 'heart-pulse', 'debit', true),
  ('Educação', '#06b6d4', 'graduation-cap', 'debit', true),
  ('Lazer', '#ec4899', 'gamepad-2', 'debit', true),
  ('Vestuário', '#f59e0b', 'shirt', 'debit', true),
  ('Salário', '#22c55e', 'banknote', 'credit', true),
  ('Freelance', '#10b981', 'briefcase', 'credit', true),
  ('Investimento', '#6366f1', 'trending-up', 'credit', true),
  ('Transferência', '#94a3b8', 'arrow-left-right', 'both', true),
  ('Outros', '#64748b', 'ellipsis', 'both', true)
ON CONFLICT DO NOTHING;
