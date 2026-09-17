-- FinanZen — initial schema
-- Supabase PostgreSQL is the single source of truth for FinanZen data.
-- This migration creates all application tables, enums, indexes and the
-- auth.users -> profiles provisioning trigger. RLS policies live in
-- supabase/policies/rls.sql and are applied after this migration.

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
create extension if not exists "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================
create type public.user_role as enum (
  'USER',
  'SUPPORT',
  'AUDITOR',
  'ADMIN',
  'SUPER_ADMIN'
);

create type public.user_status as enum (
  'ACTIVE',
  'SUSPENDED',
  'DELETED'
);

create type public.transaction_type as enum (
  'INCOME',
  'EXPENSE'
);

create type public.payment_method as enum (
  'CASH',
  'DEBIT',
  'CREDIT',
  'TRANSFER',
  'YAPE',
  'PLIN',
  'OTHER'
);

create type public.goal_status as enum (
  'ACTIVE',
  'COMPLETED',
  'CANCELLED'
);

create type public.goal_movement_type as enum (
  'DEPOSIT',
  'WITHDRAWAL'
);

create type public.theme_mode as enum (
  'LIGHT',
  'DARK',
  'SYSTEM'
);

-- ============================================================================
-- PROFILES (public mirror of auth.users, 1:1 by id)
-- ============================================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  phone text,
  avatar_url text,
  role public.user_role not null default 'USER',
  status public.user_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

create index profiles_created_at_idx on public.profiles (created_at);
create index profiles_status_idx on public.profiles (status);

-- ============================================================================
-- CATEGORIES (global defaults have user_id = null, custom categories are owned)
-- ============================================================================
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  name text not null,
  icon text,
  type public.transaction_type not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index categories_user_id_idx on public.categories (user_id);

-- ============================================================================
-- TRANSACTIONS
-- ============================================================================
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete restrict,
  type public.transaction_type not null,
  amount numeric(14, 2) not null check (amount > 0),
  description text,
  payment_method public.payment_method not null default 'CASH',
  transaction_date timestamptz not null default now(),
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index transactions_user_id_date_idx on public.transactions (user_id, transaction_date);
create index transactions_user_id_category_idx on public.transactions (user_id, category_id);
create index transactions_user_id_type_date_idx on public.transactions (user_id, type, transaction_date);

-- ============================================================================
-- BUDGETS
-- ============================================================================
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  month smallint not null check (month between 1 and 12),
  year smallint not null check (year between 2000 and 2100),
  alert_percentage smallint not null default 80 check (alert_percentage between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_id, month, year)
);

create index budgets_user_id_year_month_idx on public.budgets (user_id, year, month);

-- ============================================================================
-- SAVINGS GOALS
-- ============================================================================
create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text,
  target_amount numeric(14, 2) not null check (target_amount > 0),
  current_amount numeric(14, 2) not null default 0 check (current_amount >= 0),
  target_date date,
  status public.goal_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index savings_goals_user_id_status_idx on public.savings_goals (user_id, status);

create table public.goal_movements (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.savings_goals (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.goal_movement_type not null,
  amount numeric(14, 2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create index goal_movements_goal_id_idx on public.goal_movements (goal_id);
create index goal_movements_user_id_idx on public.goal_movements (user_id);

-- ============================================================================
-- USER PREFERENCES
-- ============================================================================
create table public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  currency text not null default 'PEN',
  theme_mode public.theme_mode not null default 'SYSTEM',
  primary_color text not null default '#16A34A',
  locale text not null default 'es-PE',
  notifications_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- NOTIFICATIONS (foundation for future notification workers)
-- ============================================================================
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_id_idx on public.notifications (user_id);

-- ============================================================================
-- AUDIT LOGS (administrative / sensitive actions)
-- ============================================================================
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  metadata jsonb,
  ip text,
  created_at timestamptz not null default now()
);

create index audit_logs_created_at_idx on public.audit_logs (created_at);
create index audit_logs_actor_user_id_created_at_idx on public.audit_logs (actor_user_id, created_at);

-- ============================================================================
-- updated_at trigger helper
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger transactions_set_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();
create trigger budgets_set_updated_at before update on public.budgets
  for each row execute function public.set_updated_at();
create trigger savings_goals_set_updated_at before update on public.savings_goals
  for each row execute function public.set_updated_at();
create trigger user_preferences_set_updated_at before update on public.user_preferences
  for each row execute function public.set_updated_at();

-- ============================================================================
-- auth.users -> profiles provisioning (never rely on the frontend for this)
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, phone, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    new.raw_user_meta_data ->> 'phone',
    'USER',
    'ACTIVE'
  )
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
