-- Cyfra — de qué cuenta/tarjeta sale el dinero para pagar una tarjeta de
-- credito, para que ese pago tambien se descuente de la cuenta de origen
-- (igual que ya pasa con los prestamos) y no aparezca "de la nada".
alter table public.account_payments
  add column source_account_id uuid references public.accounts (id) on delete set null;

create index account_payments_source_account_id_idx on public.account_payments (source_account_id);
