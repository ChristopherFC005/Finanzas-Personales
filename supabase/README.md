# Supabase — configuración de FinanZen

Guía paso a paso para provisionar el proyecto Supabase que usará FinanZen
como su única base de datos, autenticación y almacenamiento.

## 1. Crear el proyecto

1. Ve a [supabase.com](https://supabase.com) → **New project**.
2. Elige una contraseña fuerte para la base de datos (la necesitarás para
   `DATABASE_URL` / `DIRECT_URL`).
3. Elige una región cercana a Render (donde correrá NestJS) para minimizar
   latencia.
4. Crea proyectos **separados** para development/staging y production —
   nunca compartas la misma base de Supabase entre entornos.

## 2. Configurar Auth

En **Authentication → Providers**, deja habilitado Email/Password.

En **Authentication → URL Configuration**:

- **Site URL**: la URL de tu frontend en Vercel (o `http://localhost:3000`
  en desarrollo).
- **Redirect URLs**: agrega `http://localhost:3000/reset-password` y la
  URL equivalente de producción — es a donde Supabase redirige tras el
  enlace de recuperación de contraseña.

En **Authentication → Email Templates**, personaliza el template de
confirmación y de recuperación de contraseña si lo deseas (opcional).

## 3. Ejecutar las migraciones SQL

Con el [Supabase CLI](https://supabase.com/docs/guides/cli) enlazado a tu
proyecto, o pegando el contenido directamente en **SQL Editor** del
dashboard, ejecuta en orden:

1. `supabase/migrations/0001_init.sql` — tablas, enums, índices, triggers y
   el trigger `auth.users → profiles`.
2. `supabase/policies/rls.sql` — habilita RLS y crea las políticas por
   tabla.
3. `supabase/seed/categories.sql` — categorías globales por defecto
   (idempotente, seguro de re-ejecutar).

```bash
supabase link --project-ref <tu-project-ref>
supabase db push
```

## 4. Verificar el trigger de creación de perfil

Registra un usuario de prueba desde `/register` y confirma en
**Table Editor → profiles** que se creó automáticamente la fila
correspondiente (con `role = USER`, `status = ACTIVE`) y su fila en
`user_preferences`. Esto ocurre en la base de datos vía trigger
(`handle_new_user`), no depende de que el frontend complete ninguna
llamada adicional.

## 5. Configurar Storage (avatares)

En **Storage**, crea un bucket `avatars` (privado). La convención de path
usada por el backend es `avatars/{userId}/profile.webp`. Agrega una policy
de Storage que solo permita a un usuario escribir bajo su propio
`{userId}/`.

## 6. Obtener las credenciales

En **Project Settings → API**:

- `Project URL` → `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `service_role` key (secreta) → `SUPABASE_SERVICE_ROLE_KEY` (**solo**
  backend/Render, nunca en el frontend)

En **Project Settings → API → JWT Settings**:

- `JWT Secret` → `SUPABASE_JWT_SECRET` (usado por NestJS para verificar la
  firma de los access tokens que emite Supabase Auth)

En **Project Settings → Database**:

- Connection string con pooling (puerto 6543, `pgbouncer=true`) →
  `DATABASE_URL`
- Connection string directa (puerto 5432) → `DIRECT_URL` (requerida por
  Prisma para migraciones)

## 7. Conectar Prisma

Con `DATABASE_URL` y `DIRECT_URL` configuradas en `apps/api/.env`:

```bash
npm run prisma:generate --workspace=apps/api
```

Prisma no crea el esquema (eso ya lo hizo el SQL de `/supabase`); solo
genera el cliente tipado a partir de `schema.prisma`, que refleja el mismo
esquema.

## 8. Producción

- Repite los pasos 1–7 en un proyecto Supabase separado para producción.
- Actualiza `Site URL` y `Redirect URLs` con el dominio real de Vercel.
- Nunca ejecutes `supabase/seed/categories.sql` con datos destructivos —
  es idempotente por diseño, pero cualquier script adicional de seed debe
  revisarse antes de correr contra producción.
