-- Cyfra — cuentas / tarjetas del usuario (debito, credito, efectivo, ahorros)
-- Permite un saldo inicial ("con cuanto arrancas") y llevar el dinero de
-- cada tarjeta por separado (BCP, Interbank, etc.), en vez de un solo
-- payment_method generico en las transacciones.

create type public.account_type as enum (
  'CASH',
  'DEBIT',
  'CREDIT',
  'SAVINGS',
  'OTHER'
);

create table public.accounts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  name            text not null,
  type            public.account_type not null,
  bank            text,
  initial_balance numeric(14, 2) not null default 0,
  credit_limit    numeric(14, 2),
  color           text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index accounts_user_id_idx on public.accounts (user_id);

create trigger accounts_set_updated_at before update on public.accounts
  for each row execute function public.set_updated_at();

-- Cada transaccion puede (opcionalmente) pertenecer a una cuenta. Si la
-- cuenta se borra, la transaccion se conserva (no se pierde historial) y
-- simplemente queda sin cuenta asociada.
alter table public.transactions
  add column account_id uuid references public.accounts (id) on delete set null;

create index transactions_user_id_account_idx on public.transactions (user_id, account_id);

alter table public.accounts enable row level security;

create policy "accounts_select_own"
  on public.accounts for select
  using (auth.uid() = user_id);

create policy "accounts_insert_own"
  on public.accounts for insert
  with check (auth.uid() = user_id);

create policy "accounts_update_own"
  on public.accounts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "accounts_delete_own"
  on public.accounts for delete
  using (auth.uid() = user_id);
