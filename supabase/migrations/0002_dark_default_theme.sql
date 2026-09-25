-- Cyfra — el rediseño de marca (fintech oscuro, esmeralda + violeta)
-- adopta oscuro como modo por defecto para cuentas nuevas. Las cuentas
-- existentes conservan lo que ya hayan elegido; el usuario siempre puede
-- cambiarlo en Perfil > Apariencia.

alter table public.user_preferences
  alter column theme_mode set default 'DARK';

alter table public.user_preferences
  alter column primary_color set default '#10B981';
