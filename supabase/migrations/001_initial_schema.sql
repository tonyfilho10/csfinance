-- Enable extensions
create extension if not exists "uuid-ossp";

-- ─── PROFILES ────────────────────────────────────────────────────────────────
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  email text not null,
  avatar_url text,
  created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email);
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─── ENTITIES (PF / PJ) ──────────────────────────────────────────────────────
create type entity_type as enum ('PF', 'PJ');
create table entities (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type entity_type not null,
  document text not null,
  owner_id uuid references auth.users not null,
  created_at timestamptz default now()
);
alter table entities enable row level security;

-- ─── ENTITY MEMBERS ──────────────────────────────────────────────────────────
create type user_role as enum ('owner', 'admin', 'member');
create table entity_members (
  id uuid primary key default uuid_generate_v4(),
  entity_id uuid references entities on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  role user_role not null default 'member',
  invited_at timestamptz default now(),
  accepted_at timestamptz,
  unique(entity_id, user_id)
);
alter table entity_members enable row level security;

-- RLS: user can see entities they own or are member of
create policy "Entity visibility" on entities for select
  using (
    owner_id = auth.uid() or
    exists (select 1 from entity_members m where m.entity_id = id and m.user_id = auth.uid() and m.accepted_at is not null)
  );
create policy "Entity insert by owner" on entities for insert with check (owner_id = auth.uid());
create policy "Entity update by admin" on entities for update
  using (
    owner_id = auth.uid() or
    exists (select 1 from entity_members m where m.entity_id = id and m.user_id = auth.uid() and m.role in ('owner','admin'))
  );

create policy "Members visibility" on entity_members for select
  using (
    user_id = auth.uid() or
    exists (select 1 from entity_members m where m.entity_id = entity_id and m.user_id = auth.uid())
  );
create policy "Admin can manage members" on entity_members for all
  using (
    exists (select 1 from entity_members m where m.entity_id = entity_id and m.user_id = auth.uid() and m.role in ('owner','admin'))
  );

-- ─── CATEGORIES ──────────────────────────────────────────────────────────────
create type transaction_type as enum ('credit', 'debit', 'both');
create table categories (
  id uuid primary key default uuid_generate_v4(),
  entity_id uuid references entities on delete cascade,
  name text not null,
  color text not null default '#6366f1',
  icon text,
  type transaction_type not null default 'both',
  is_system boolean not null default false
);
alter table categories enable row level security;
create policy "Categories visibility" on categories for select
  using (
    is_system = true or
    entity_id is null or
    exists (select 1 from entities e where e.id = entity_id and (
      e.owner_id = auth.uid() or
      exists (select 1 from entity_members m where m.entity_id = e.id and m.user_id = auth.uid())
    ))
  );
create policy "Categories insert" on categories for insert
  with check (entity_id is not null and exists (
    select 1 from entities e where e.id = entity_id and e.owner_id = auth.uid()
  ));

-- Seed system categories
insert into categories (name, color, icon, type, is_system) values
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
  ('Outros', '#64748b', 'ellipsis', 'both', true);

-- ─── BANK ACCOUNTS ───────────────────────────────────────────────────────────
create table bank_accounts (
  id uuid primary key default uuid_generate_v4(),
  entity_id uuid references entities on delete cascade not null,
  name text not null,
  bank_name text not null,
  bank_code text,
  account_number text,
  agency text,
  initial_balance numeric(15,2) not null default 0,
  current_balance numeric(15,2) not null default 0,
  color text default '#6366f1',
  created_at timestamptz default now()
);
alter table bank_accounts enable row level security;
create policy "Bank accounts visibility" on bank_accounts for select
  using (exists (
    select 1 from entities e where e.id = entity_id and (
      e.owner_id = auth.uid() or
      exists (select 1 from entity_members m where m.entity_id = e.id and m.user_id = auth.uid() and m.accepted_at is not null)
    )
  ));
create policy "Bank accounts insert" on bank_accounts for insert
  with check (exists (
    select 1 from entities e where e.id = entity_id and (
      e.owner_id = auth.uid() or
      exists (select 1 from entity_members m where m.entity_id = e.id and m.user_id = auth.uid() and m.role in ('owner','admin'))
    )
  ));
create policy "Bank accounts update" on bank_accounts for update
  using (exists (
    select 1 from entities e where e.id = entity_id and (
      e.owner_id = auth.uid() or
      exists (select 1 from entity_members m where m.entity_id = e.id and m.user_id = auth.uid() and m.role in ('owner','admin'))
    )
  ));

-- ─── TRANSACTIONS ─────────────────────────────────────────────────────────────
create type transaction_status as enum ('pending', 'reconciled', 'ignored');
create table transactions (
  id uuid primary key default uuid_generate_v4(),
  bank_account_id uuid references bank_accounts on delete cascade not null,
  entity_id uuid references entities on delete cascade not null,
  date date not null,
  description text not null,
  amount numeric(15,2) not null,
  type transaction_type not null,
  category_id uuid references categories,
  status transaction_status not null default 'pending',
  ofx_id text,
  notes text,
  created_at timestamptz default now(),
  unique(bank_account_id, ofx_id)
);
alter table transactions enable row level security;
create policy "Transactions visibility" on transactions for select
  using (exists (
    select 1 from entities e where e.id = entity_id and (
      e.owner_id = auth.uid() or
      exists (select 1 from entity_members m where m.entity_id = e.id and m.user_id = auth.uid() and m.accepted_at is not null)
    )
  ));
create policy "Transactions insert" on transactions for insert
  with check (exists (
    select 1 from entities e where e.id = entity_id and (
      e.owner_id = auth.uid() or
      exists (select 1 from entity_members m where m.entity_id = e.id and m.user_id = auth.uid() and m.role in ('owner','admin'))
    )
  ));
create policy "Transactions update" on transactions for update
  using (exists (
    select 1 from entities e where e.id = entity_id and (
      e.owner_id = auth.uid() or
      exists (select 1 from entity_members m where m.entity_id = e.id and m.user_id = auth.uid() and m.role in ('owner','admin'))
    )
  ));

-- ─── RECALCULATE BALANCE TRIGGER ─────────────────────────────────────────────
create or replace function recalculate_account_balance()
returns trigger language plpgsql as $$
declare
  v_balance numeric;
begin
  select initial_balance + coalesce(sum(
    case when type = 'credit' then amount else -amount end
  ), 0)
  into v_balance
  from bank_accounts ba
  left join transactions t on t.bank_account_id = ba.id and t.status != 'ignored'
  where ba.id = coalesce(new.bank_account_id, old.bank_account_id)
  group by ba.initial_balance;

  update bank_accounts set current_balance = v_balance
  where id = coalesce(new.bank_account_id, old.bank_account_id);

  return coalesce(new, old);
end;
$$;
create trigger update_balance_on_transaction
  after insert or update or delete on transactions
  for each row execute procedure recalculate_account_balance();
