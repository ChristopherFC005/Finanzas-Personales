-- FinanZen — pagos a tarjetas de credito, separados de las transacciones
-- normales (una tarjeta de credito nunca recibe "ingresos" en el sentido
-- normal; pagarla es su propia accion). Un pago regular libera linea de
-- credito de inmediato; un pago "a cuotas" reduce la deuda mostrada pero
-- el banco mantiene ese monto comprometido, asi que NO se libera como
-- disponible hasta que las cuotas terminen.

create table public.account_payments (
  id             uuid primary key default gen_random_uuid(),
  account_id     uuid not null references public.accounts (id) on delete cascade,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  amount         numeric(14, 2) not null check (amount > 0),
  is_installment boolean not null default false,
  paid_at        timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

create index account_payments_account_id_idx on public.account_payments (account_id);
create index account_payments_user_id_idx on public.account_payments (user_id);

alter table public.account_payments enable row level security;

create policy "account_payments_select_own"
  on public.account_payments for select
  using (auth.uid() = user_id);

create policy "account_payments_insert_own"
  on public.account_payments for insert
  with check (auth.uid() = user_id);

-- Historial inmutable, igual que goal_movements y loan_payments: sin
-- policies de update/delete.
