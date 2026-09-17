-- FinanZen — default global categories (user_id = null)
-- Safe to re-run: skips names that already exist as global categories.

insert into public.categories (name, icon, type, is_default, user_id)
select v.name, v.icon, v.type::public.transaction_type, true, null
from (
  values
    ('Alimentación', 'utensils', 'EXPENSE'),
    ('Transporte', 'car', 'EXPENSE'),
    ('Vivienda', 'home', 'EXPENSE'),
    ('Servicios', 'plug', 'EXPENSE'),
    ('Salud', 'heart-pulse', 'EXPENSE'),
    ('Educación', 'graduation-cap', 'EXPENSE'),
    ('Entretenimiento', 'film', 'EXPENSE'),
    ('Compras', 'shopping-bag', 'EXPENSE'),
    ('Deudas', 'credit-card', 'EXPENSE'),
    ('Otros', 'ellipsis', 'EXPENSE'),
    ('Salario', 'wallet', 'INCOME'),
    ('Negocio', 'briefcase', 'INCOME'),
    ('Ahorro', 'piggy-bank', 'INCOME')
) as v(name, icon, type)
where not exists (
  select 1 from public.categories c
  where c.user_id is null and c.name = v.name
);
