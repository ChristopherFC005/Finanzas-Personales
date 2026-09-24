-- FinanZen — vincula cada prestamo a la cuenta/tarjeta de donde salio el
-- dinero prestado (efectivo, ahorros, debito o credito), para que ese monto
-- se refleje en el saldo de esa cuenta. Nullable porque prestamos ya
-- existentes no tienen cuenta asociada; el backend exige el campo para
-- prestamos nuevos.

alter table public.loans
  add column account_id uuid references public.accounts (id) on delete set null;

create index loans_account_id_idx on public.loans (account_id);
