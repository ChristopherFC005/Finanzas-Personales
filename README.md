# FinanZen

FinanZen es una aplicación SaaS de finanzas personales: multiusuario, segura
y preparada para producción. Cada usuario gestiona sus propios ingresos,
gastos, presupuestos y metas de ahorro; un panel administrativo independiente
permite supervisar la plataforma sin acceso indiscriminado a datos
financieros privados.

## Arquitectura

```
Usuario
  │
  ▼
Next.js (Vercel)  ──REST/HTTPS──▶  NestJS (Render)  ──▶  Supabase
  Frontend                          Lógica de negocio      PostgreSQL · Auth · Storage · RLS
```

- **Supabase** es la única base de datos PostgreSQL del proyecto. No existe
  una segunda base de datos en Render.
- **Next.js** habla con Supabase Auth directamente para login/registro/reset
  de contraseña, y con la API de NestJS (con el access token de Supabase
  como Bearer) para todo lo demás.
- **NestJS** nunca confía en un `userId` enviado por el cliente: valida el
  access token de Supabase en cada request y resuelve la identidad desde su
  propia tabla `profiles`.
- **RLS** en Supabase es una capa adicional de defensa en profundidad, no la
  única. Ver [`supabase/README.md`](supabase/README.md).

## Estructura del monorepo

```
apps/
  web/     Next.js 14 (App Router) + Tailwind + shadcn-style UI + TanStack Query
  api/     NestJS + Prisma
packages/
  types/   (reservado para tipos compartidos entre apps)
supabase/
  migrations/  esquema SQL versionado
  policies/    políticas RLS
  seed/        categorías por defecto
docs/
```

## Requisitos

- Node.js 20+
- Una cuenta y proyecto de [Supabase](https://supabase.com)
- npm (workspaces)

## Instalación

```bash
npm install
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
```

Completa las variables de entorno siguiendo [`supabase/README.md`](supabase/README.md)
para obtener las credenciales de tu proyecto Supabase.

## Desarrollo local

```bash
npm run dev:api   # NestJS en http://localhost:3001
npm run dev:web   # Next.js en http://localhost:3000
```

Swagger de la API (solo en desarrollo): `http://localhost:3001/api/docs`.

## Base de datos y migraciones

El esquema vive en `supabase/migrations` (SQL plano, aplicado con el
Supabase CLI o el SQL Editor del dashboard) y Prisma (`apps/api/prisma/schema.prisma`)
lo refleja para que NestJS pueda consultarlo con seguridad de tipos.

```bash
npm run prisma:generate --workspace=apps/api
```

Prisma **no** administra RLS ni los triggers de `auth.users → profiles`:
esos viven en SQL versionado dentro de `/supabase`, que es la fuente de
verdad del esquema.

## Seguridad — checklist por funcionalidad

Antes de dar por terminada una funcionalidad, verificar:

- ¿Pasa por NestJS cuando hay lógica de negocio (no solo por Supabase directo)?
- ¿Tiene RLS habilitada en Supabase?
- ¿NestJS re-valida el ownership (nunca confía en un `userId` del cliente)?
- ¿Está aislada por usuario (probar: usuario A no puede ver datos de usuario B)?
- ¿Los endpoints administrativos devuelven 403 para un usuario `USER`?
- ¿Maneja errores con el formato de respuesta estándar (sin stack traces al cliente)?
- ¿Funciona en móvil y en modo oscuro?
- ¿Respeta el color principal elegido por el usuario?

## Tests

```bash
npm run test:api --workspace=apps/api
```

Los tests incluidos cubren específicamente los dos escenarios de seguridad
más importantes del proyecto: aislamiento de datos entre usuarios
(`transactions.service.spec.ts`) y protección 403 de rutas de administración
(`roles.guard.spec.ts`).

## Despliegue

### Frontend — Vercel

Variables de entorno (solo públicas, seguras para el navegador):

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

### Backend — Render

Variables de entorno:

- `NODE_ENV`, `PORT` (Render lo inyecta; NestJS escucha `process.env.PORT`)
- `DATABASE_URL`, `DIRECT_URL`
- `SUPABASE_URL` (los tokens ES256/RS256 se verifican con el JWKS público del proyecto)
- `SUPABASE_JWT_SECRET` solo si el proyecto usa el secreto legacy HS256; si no, déjalo vacío
- `SUPABASE_SERVICE_ROLE_KEY`
- `FRONTEND_URL` (usado para configurar CORS sin wildcard)
- `ANTHROPIC_API_KEY` (asistente financiero)

Healthcheck: `GET /health` → `{ "status": "ok" }` (fuera de `/api`, sin
versión, para que el probe de Render no dependa del prefijo de la API).

`SUPABASE_SERVICE_ROLE_KEY` es secreta: solo debe vivir en las variables de
entorno del backend en Render, nunca en el repositorio, en el frontend o en
logs.

## Lo que NO se hizo (y por qué)

Esta base cubre arquitectura, seguridad, y los módulos centrales (auth,
perfiles, categorías, transacciones, presupuestos, metas, estadísticas,
auditoría, administración, asistente IA) de punta a punta. Quedan
pendientes de una siguiente iteración, deliberadamente fuera del alcance de
este commit inicial:

- Creación real de los proyectos en Supabase/Vercel/Render (requiere tus
  credenciales — sigue `supabase/README.md`).
- Gráficos adicionales (evolución del ahorro, comparación mensual,
  desglose completo de gastos por categoría).
- Subida de avatar a Supabase Storage.
- Suite de tests e2e completa y pipeline de CI/CD en GitHub Actions.
- Notificaciones y workers en background (colas, Redis).
