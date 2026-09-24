-- FinanZen — se elimina el modulo de Presupuestos. cascade se lleva de paso
-- su trigger, indices y policies (creados en 0001_init.sql / policies/rls.sql).

drop table if exists public.budgets cascade;
