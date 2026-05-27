# Transport Reservations

Sistema de planificación de viajes de pasajeros y encomiendas. Instalación **single-tenant**: una única organización con N sucursales operativas. Diseñado para ser consumido tanto desde la web (NextAuth cookie) como desde una app móvil (JWT Bearer) sobre la misma REST API `/api/v1/*`.

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 App Router · React 19 · TypeScript strict |
| UI | shadcn/ui v4 · Tailwind CSS v4 · Radix UI |
| Forms | React Hook Form v7 · Zod v4 |
| Tablas | TanStack Table v8 |
| Auth web | NextAuth.js v5 beta (cookie de sesión) |
| Auth mobile | JWT firmado con `jose` (HS256, `AUTH_SECRET`) + refresh con rotación |
| ORM | Prisma v7 (adapter-based, sin `url` en `schema.prisma`) |
| Base de datos | Supabase (PostgreSQL) vía `@prisma/adapter-pg` |
| Notificaciones | Sonner |
| Tests API | Vitest |
| Tests E2E | Playwright |

## Inicio rápido

> **Requisito previo**: el proyecto de Supabase debe estar activo (no pausado).

```bash
# 1. Variables de entorno
cp .env.example .env   # completar DATABASE_URL, DIRECT_URL, AUTH_SECRET

# 2. Dependencias
npm install

# 3. Base de datos (greenfield — destruye y recrea la DB)
npx prisma migrate reset --force
npx prisma migrate dev --name init_single_tenant
npx prisma db seed

# 4. Desarrollo
npm run dev            # http://localhost:3000
```

## Variables de entorno

```env
DATABASE_URL="postgresql://..."    # connection pooler de Supabase
DIRECT_URL="postgresql://..."      # conexión directa (para migraciones)
AUTH_SECRET="..."                  # secreto compartido NextAuth + JWT (openssl rand -base64 32)
```

`.env.test` (gitignored) replica `DATABASE_URL` apuntando a una DB separada para Vitest/Playwright. Plantilla: `.env.test.example`.

## Comandos

```bash
npm run dev                        # servidor de desarrollo
npm run build                      # build de producción
npm run lint                       # ESLint

# Tests
npm run test                       # API smoke tests (Vitest)
npm run test:e2e                   # E2E web (Playwright) — requiere `npm run dev` corriendo
npm run test:setup                 # resetea DB + seed para tests

# Prisma
npx prisma migrate reset --force   # destruye DB + corre migraciones
npx prisma migrate dev --name xxx  # crear y aplicar migración
npx prisma db seed                 # insertar datos iniciales
npx prisma studio                  # GUI de base de datos
```

## Credenciales sembradas (post `prisma db seed`)

| Rol             | Email                | Password      | Sucursal    |
|-----------------|----------------------|---------------|-------------|
| `OWNER`         | `owner@system.com`   | `Admin1234!`  | (todas)     |
| `SUCURSAL_USER` | `user@system.com`    | `User1234!`   | `principal` |

El login es único: `/login` (sin slug). El rol y la sucursal se derivan del usuario.

## REST API

Todos los endpoints viven bajo `/api/v1/*`. La autenticación se resuelve automáticamente vía `requireAuth(req)`:

1. Si el request trae `Authorization: Bearer <accessToken>` → se verifica el JWT (mobile).
2. Si no → fallback a la sesión NextAuth (cookie HttpOnly, web).

| Endpoint base | Ejemplos |
|---|---|
| `POST /api/v1/auth/login` | Devuelve `{ accessToken, refreshToken, user }` (mobile) o solo setea cookie (web). |
| `POST /api/v1/auth/refresh` | Rotación atómica de refresh tokens. |
| `DELETE /api/v1/auth/logout` | Borra refresh (mobile). Web usa `signOutAction`. |
| `GET/POST/PATCH/DELETE /api/v1/<resource>[/:id]` | CRUD para `branches`, `users`, `routes`, `trips`, `passengers`, `proveedores`, `reservations/passengers`, `reservations/cargo`, etc. |
| `POST /api/v1/branches/active` | Cambia la sucursal activa del OWNER (cookie `active_branch_id`). |
| `POST /api/v1/trips/:id/{open,close}` | Transición de estado del viaje. |
| `POST /api/v1/trips/:id/manifest` | Genera (o devuelve existente) el manifiesto del viaje. |
| `GET /api/v1/manifests/:code/pdf` | PDF del manifiesto (con auth). |

Todas las respuestas siguen el envelope `{ data }` (éxito) o `{ error: { code, message, details? } }` (fallo). Códigos de error: `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `SERVER_ERROR`.

## Estructura de carpetas

```
app/
  (auth)/login/                    # Login único (sin slug)
  (admin)/                         # Área protegida por NextAuth (OWNER + SUCURSAL_USER)
    layout.tsx                     # Verifica sesión + resuelve sucursal activa
    calendario/                    # Default landing
    viajes/                        # CRUD de viajes
    reservas/, encomiendas/, ...   # Operaciones diarias
    paises/, rutas/, ...           # Mantenimiento (OWNER-only via notFound())
  actions/
    auth.ts                        # signOutAction (única server action que sobrevive)
  api/
    auth/[...nextauth]/            # Handler NextAuth (cookie web)
    v1/                            # REST API (mobile + web)
      auth/, branches/, trips/, reservations/, ...

components/
  ui/                              # Primitivos shadcn/ui (no modificar)
  agency-sidebar.tsx               # Sidebar principal
  branch-switcher.tsx              # Selector de sucursal (OWNER multi-branch)
  site-header.tsx, nav-user.tsx    # Chrome del layout

lib/
  db.ts                            # Cliente Prisma singleton (PrismaPg adapter)
  branch-context.ts                # getActiveBranch / requireActiveBranch
  constants.ts                     # ROUTES (flat, sin slug)
  api/
    auth.ts, with-auth.ts          # requireAuth + withAuth wrapper
    response.ts                    # ok/created/badRequest/forbidden/...
    client.ts                      # api.* (typed fetch client) usado por el web
    schemas/                       # Zod por recurso (createX/updateX/xQuery)
  services/                        # Lógica de negocio por recurso (prisma queries)
  generated/prisma/                # Cliente generado por Prisma (no editar)

prisma/
  schema.prisma                    # Modelos (sin Agency)
  seed.ts                          # Lookups + Role + 1 Branch + 1 OWNER + 1 SUCURSAL_USER
  migrations/                      # Una sola migración inicial post-refactor

tests/
  _helpers/auth.ts                 # loginAsOwner, loginAsBranchUser, apiFetch
  api/                             # Vitest — smoke tests contra /api/v1/*
  web/                             # Playwright — flows reales en el browser

auth.ts                            # NextAuth config (Credentials, callbacks)
auth.config.ts                     # Config compartida (edge-safe)
middleware.ts                      # Gating de rutas (redirect a /login)
prisma.config.ts                   # Connection strings de Prisma v7
types/next-auth.d.ts               # Session.user.{role, branchId}
```

## Roles

| Rol             | `branchId` | Puede                                                   |
|-----------------|------------|---------------------------------------------------------|
| `OWNER`         | `null`     | Todo. Cambia de sucursal vía cookie `active_branch_id`. |
| `SUCURSAL_USER` | requerido  | CRUD scoped a su sucursal. Switcher deshabilitado.      |

No existen `SUPER_ADMIN`, `AGENCY_ADMIN` ni rutas por slug — se eliminaron en el refactor a single-tenant.

## Patrones importantes

### Prisma v7 — adapter obligatorio

```ts
// lib/db.ts — SIEMPRE usar PrismaPg adapter
import { PrismaPg } from "@prisma/adapter-pg";
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });
```

El `schema.prisma` **no lleva `url`** en el datasource. La URL va en `prisma.config.ts`.

```ts
// Imports correctos desde el cliente generado
import { PrismaClient } from "@/lib/generated/prisma/client";
import { Role } from "@/lib/generated/prisma/enums";
```

### Rutas — usar `ROUTES`, no strings literales

```ts
import { ROUTES } from "@/lib/constants";

// Correcto
redirect(ROUTES.LOGIN);
router.push(ROUTES.CALENDARIO);

// Incorrecto
redirect("/login");
```

### Auth — dual transport en una sola función

`requireAuth(req)` decide automáticamente entre Bearer y cookie. Los handlers NO discriminan transporte.

```ts
// app/api/v1/<resource>/route.ts
import { withAuth } from "@/lib/api/with-auth";

export const GET = withAuth(async (_req, _ctx, session) => {
  // session = { userId, role, branchId, transport: "bearer" | "cookie" }
  return ok(await getResources(session.branchId));
});
```

### Mutaciones desde el cliente web — `api.*` typed client

```ts
import { api } from "@/lib/api/client";
import { useRouter } from "next/navigation";

const router = useRouter();
await api.trips.create({ ... });
router.refresh(); // re-render del Server Component padre
```

No se usa `revalidatePath` en el codebase — todas las invalidaciones pasan por `router.refresh()`.
