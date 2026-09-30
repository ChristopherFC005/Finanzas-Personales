-- Cyfra — presupuestos mensuales por categoría, con umbral de alerta.
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

create trigger budgets_set_updated_at before update on public.budgets
  for each row execute function public.set_updated_at();

alter table public.budgets enable row level security;

create policy "budgets_select_own"
  on public.budgets for select
  using (auth.uid() = user_id);

create policy "budgets_insert_own"
  on public.budgets for insert
  with check (auth.uid() = user_id);

create policy "budgets_update_own"
  on public.budgets for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "budgets_delete_own"
  on public.budgets for delete
  using (auth.uid() = user_id);
