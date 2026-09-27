-- Cyfra — fecha de facturacion (corte) y fecha de pago para tarjetas de
-- credito. Solo se pueden establecer/editar dentro de los 3 dias
-- posteriores a la creacion de la cuenta (regla validada en el backend,
-- no en SQL).
alter table public.accounts
  add column billing_date date,
  add column payment_due_date date;

-- Cyfra — cuando le pagan un prestamo, ese dinero se refleja de vuelta en
-- la cuenta/tarjeta desde la que se prestó originalmente. Se copia el
-- account_id del prestamo al momento del pago para no tener que hacer
-- join con loans en cada calculo de saldo de cuenta.
alter table public.loan_payments
  add column account_id uuid references public.accounts (id) on delete set null;

create index loan_payments_account_id_idx on public.loan_payments (account_id);
