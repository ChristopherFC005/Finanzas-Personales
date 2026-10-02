-- Cyfra — ingresos fijos/recurrentes (sueldo, negocio, etc.), cada uno
-- ligado a la cuenta/tarjeta a la que debe entrar el dinero cada mes.
create table public.fixed_incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete restrict,
  account_id uuid not null references public.accounts (id) on delete cascade,
  name text not null,
  amount numeric(14, 2) not null check (amount > 0),
  day_of_month smallint not null check (day_of_month between 1 and 31),
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index fixed_incomes_user_id_idx on public.fixed_incomes (user_id);

create trigger fixed_incomes_set_updated_at before update on public.fixed_incomes
  for each row execute function public.set_updated_at();

alter table public.transactions
  add column fixed_income_id uuid references public.fixed_incomes (id) on delete set null;

create index transactions_fixed_income_id_idx on public.transactions (fixed_income_id);

alter table public.fixed_incomes enable row level security;

create policy "fixed_incomes_select_own"
  on public.fixed_incomes for select
  using (auth.uid() = user_id);

create policy "fixed_incomes_insert_own"
  on public.fixed_incomes for insert
  with check (auth.uid() = user_id);

create policy "fixed_incomes_update_own"
  on public.fixed_incomes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "fixed_incomes_delete_own"
  on public.fixed_incomes for delete
  using (auth.uid() = user_id);
