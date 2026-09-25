-- Cyfra — prestamos que el usuario hizo a otras personas (no deudas del
-- usuario): a quien le presto, cuanto le deben, y cuando le deben pagar,
-- ya sea de una sola vez o en cuotas mensuales.

create type public.loan_payment_type as enum (
  'SINGLE',
  'INSTALLMENTS'
);

create type public.loan_status as enum (
  'ACTIVE',
  'PAID',
  'CANCELLED'
);

create table public.loans (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles (id) on delete cascade,
  borrower_name      text not null,
  total_amount       numeric(14, 2) not null check (total_amount > 0),
  payment_type       public.loan_payment_type not null,
  due_date           date,             -- usado cuando payment_type = SINGLE
  installments_count smallint,         -- usado cuando payment_type = INSTALLMENTS
  first_due_date     date,             -- usado cuando payment_type = INSTALLMENTS
  notes              text,
  status             public.loan_status not null default 'ACTIVE',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint loans_single_has_due_date
    check (payment_type <> 'SINGLE' or due_date is not null),
  constraint loans_installments_has_schedule
    check (
      payment_type <> 'INSTALLMENTS'
      or (installments_count is not null and installments_count > 0 and first_due_date is not null)
    )
);

create index loans_user_id_status_idx on public.loans (user_id, status);

create trigger loans_set_updated_at before update on public.loans
  for each row execute function public.set_updated_at();

create table public.loan_payments (
  id         uuid primary key default gen_random_uuid(),
  loan_id    uuid not null references public.loans (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  amount     numeric(14, 2) not null check (amount > 0),
  paid_at    timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index loan_payments_loan_id_idx on public.loan_payments (loan_id);
create index loan_payments_user_id_idx on public.loan_payments (user_id);

alter table public.loans enable row level security;

create policy "loans_select_own"
  on public.loans for select
  using (auth.uid() = user_id);

create policy "loans_insert_own"
  on public.loans for insert
  with check (auth.uid() = user_id);

create policy "loans_update_own"
  on public.loans for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "loans_delete_own"
  on public.loans for delete
  using (auth.uid() = user_id);

alter table public.loan_payments enable row level security;

create policy "loan_payments_select_own"
  on public.loan_payments for select
  using (auth.uid() = user_id);

create policy "loan_payments_insert_own"
  on public.loan_payments for insert
  with check (auth.uid() = user_id);

-- Los pagos son historial inmutable: sin policies de update/delete, igual
-- que goal_movements.
