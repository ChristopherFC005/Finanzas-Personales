-- Cyfra — préstamos ya entregados fuera de la app (efectivo, transferencia
-- previa, etc.): el monto no debe descontarse del saldo de la cuenta/tarjeta,
-- solo los cobros posteriores cuentan.
alter table public.loans
  add column is_external boolean not null default false;
