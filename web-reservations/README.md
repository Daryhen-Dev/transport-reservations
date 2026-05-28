# Transport Reservations

Sistema de planificación de viajes de pasajeros y encomiendas. Instalación **single-tenant**: una única organización con N sucursales operativas. Diseñado para ser consumido tanto desde la web (NextAuth cookie) como desde una app móvil (JWT Bearer) sobre la misma REST API `/api/v1/*`.

## Funcionalidades actuales

| Área | Estado |
|---|---|
| 🔐 Login web (single page) + logout | ✅ |
| 🔁 Mobile login con JWT + refresh rotación | ✅ |
| 🏢 BranchSwitcher para OWNER multi-sucursal (cookie `HttpOnly`) | ✅ |
| 🧭 Header con título de sección dinámico + user + sucursal activa | ✅ |
| 👥 Usuarios CRUD con roles (`OWNER` / `SUCURSAL_USER`) | ✅ |
| 🌎 Países, Estados de viaje, Tipos de proveedor — catálogos OWNER-only | ✅ |
| 🚏 Sucursales, Rutas, Horarios (horario por ruta) | ✅ |
| ⚓ Tripulantes (con UX: delete deshabilitado si está en viajes) | ✅ |
| 🚐 Viajes — CRUD + open/close + asignación de tripulación + manifiesto PDF | ✅ |
| 📋 Detalle del viaje `/viajes/[id]` — ruta, tripulación, pasajeros, encomiendas (read-only) | ✅ |
| 🎫 Reservas de pasajeros — proveedor PERSONA/EMPRESA + asientos + pasajeros vinculados | ✅ |
| ✅ Confirm/Cancel reserva — botones explícitos en lista + panel de status en detalle | ✅ |
| 📦 Reservas de encomiendas — proveedor + destinatario + categoría + status doble | ✅ |
| 📑 Manifiesto del viaje — código generado + PDF descargable con auth | ✅ |
| 🗓️ Calendario mensual con viajes por día | ✅ |
| 🔒 Cierre de viaje gated — bloquea si hay pendientes O asientos sin pasajero asignado | ✅ |

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 App Router · React 19 · TypeScript strict |
| UI | shadcn/ui v4 · Tailwind CSS v4 · Radix UI · Sonner (toasts) |
| Forms | React Hook Form v7 · Zod v4 |
| Tablas | TanStack Table v8 |
| Auth web | NextAuth.js v5 beta (cookie de sesión, HttpOnly) |
| Auth mobile | JWT firmado con `jose` (HS256, `AUTH_SECRET`) + refresh con rotación atómica |
| ORM | Prisma v7 (adapter-based, sin `url` en `schema.prisma`) |
| Base de datos | PostgreSQL (local en dev, Supabase en prod) vía `@prisma/adapter-pg` |
| PDFs | `@react-pdf/renderer` (manifiestos) |
| Tests API | Vitest |
| Tests E2E | Playwright |

## Inicio rápido

> El proyecto usa Postgres local por default. Si querés apuntar a Supabase, ver "Local vs Supabase" abajo.

```bash
# 1. Variables de entorno
cp .env.example .env       # completar AUTH_SECRET
cp .env.test.example .env.test   # (opcional) para tests

# 2. Dependencias
npm install

# 3. Base de datos (greenfield — destruye y recrea la DB)
npx prisma migrate reset --force
npx prisma migrate dev --name init_single_tenant
npx prisma db seed

# 4. Desarrollo
npm run dev            # http://localhost:3000
```

### Local vs Supabase

`prisma.config.ts` carga `.env.local` con **override** sobre `.env`. Esto te deja apuntar a Postgres local sin tocar el `.env` principal:

```env
# .env (commited en CI, apunta a Supabase por ej.)
DATABASE_URL="postgresql://...@aws-us-east-1.pooler.supabase.com:5432/postgres"

# .env.local (gitignored, override para dev)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/transport_reservations"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/transport_reservations"
```

Si `.env.local` existe, se usa. Si no, `.env`. **Next.js carga `.env.local` solo**, pero Prisma necesita el override explícito que está en `prisma.config.ts:7-11`.

## Variables de entorno

```env
DATABASE_URL="postgresql://..."    # conexión principal (Postgres local o pooler de Supabase)
DIRECT_URL="postgresql://..."      # conexión directa (para migraciones; Supabase requiere distinto puerto)
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
npx prisma generate                # regenerar el cliente (después de cambiar schema)
```

## Credenciales sembradas (post `prisma db seed`)

| Rol             | Email                | Password      | Sucursal    |
|-----------------|----------------------|---------------|-------------|
| `OWNER`         | `owner@system.com`   | `Admin1234!`  | (todas)     |
| `SUCURSAL_USER` | `user@system.com`    | `User1234!`   | `principal` |

El login es único: `/login` (sin slug). El rol y la sucursal se derivan del usuario logueado.

## Rutas del admin

Bajo `(admin)/`, protegidas por NextAuth + `requireActiveBranch()`. Todas son flat (sin `[slug]`):

| Ruta | Quién | Descripción |
|---|---|---|
| `/calendario` | Ambos roles | Vista mensual con viajes del día seleccionado |
| `/dashboard` | Ambos | Resumen ejecutivo |
| `/viajes` | Ambos | CRUD de viajes + open/close + asignación tripulación + manifiesto |
| `/viajes/[id]` | Ambos (scoped) | Detalle read-only completo |
| `/reservas` | Ambos | Reservas de pasajeros con Confirmar/Cancelar |
| `/reservas/[id]` | Ambos | Gestión: vincular pasajeros + status panel + cambiar viaje/asientos |
| `/reservas/nueva` | Ambos | Selector pasajeros vs encomiendas + wizard de creación |
| `/encomiendas` | Ambos | Reservas de carga con estado de tránsito |
| `/manifiestos` | Ambos | Buscar manifiesto por código + descargar PDF |
| `/pasajeros` | Ambos | Padrón global de pasajeros |
| `/proveedores` | Ambos | Proveedores PERSONA/EMPRESA |
| `/tripulacion` | Ambos | Tripulantes (delete bloqueado si tiene viajes) |
| `/rutas` | Ambos | Rutas por sucursal |
| `/horarios` | Ambos | Horarios fijos por ruta |
| `/sucursales` | **OWNER** | CRUD de sucursales |
| `/usuarios` | **OWNER** | Crear OWNER o SUCURSAL_USER |
| `/paises` | OWNER (CRUD) | Catálogo de países |
| `/estados-viaje` | OWNER (CRUD) | Catálogo de estados de viaje |

Páginas `OWNER-only` devuelven `notFound()` cuando entra un SUCURSAL_USER.

## REST API

Todos los endpoints viven bajo `/api/v1/*`. La autenticación se resuelve automáticamente vía `requireAuth(req)`:

1. Si el request trae `Authorization: Bearer <accessToken>` → se verifica el JWT (mobile).
2. Si no → fallback a la sesión NextAuth (cookie HttpOnly, web).

| Endpoint base | Ejemplos |
|---|---|
| `POST /api/v1/auth/login` | Devuelve `{ accessToken, refreshToken, user }` (mobile). |
| `POST /api/v1/auth/refresh` | Rotación atómica de refresh tokens. |
| `DELETE /api/v1/auth/logout` | Borra refresh (mobile). Web usa `signOut` de `next-auth/react`. |
| `GET/POST/PATCH/DELETE /api/v1/<resource>[/:id]` | CRUD para `branches`, `users`, `routes`, `trips`, `passengers`, `proveedores`, `crew-members`, `trip-schedules`, `trip-statuses`, `countries`, `reservations/passengers`, `reservations/cargo`. |
| `POST/DELETE /api/v1/branches/active` | Cambia/limpia la sucursal activa del OWNER (cookie `active_branch_id`). |
| `POST /api/v1/trips/:id/{open,close}` | Transición de estado. `close` bloquea si hay pendientes o asientos sin pasajero asignado. |
| `POST /api/v1/trips/:id/manifest` | Genera (o devuelve existente) el manifiesto del viaje cerrado. |
| `PUT/DELETE /api/v1/trips/:tripId/crew/:crewMemberId` | Asignar / quitar tripulante. |
| `GET /api/v1/manifests/:code` | Lookup JSON. |
| `GET /api/v1/manifests/:code/pdf` | PDF del manifiesto (con auth). |
| `POST /api/v1/reservations/passengers/:id/passengers` | Vincular pasajero (crear+link o link existente). |
| `PATCH /api/v1/reservations/passengers/:id/status` | Cambiar estado: PENDIENTE / CONFIRMADA / CANCELADA. |
| `GET /api/v1/calendar?year=&month=&branchId=` | Datos del calendario. |

Todas las respuestas siguen el envelope `{ data }` (éxito) o `{ error: { code, message, details? } }` (fallo). Códigos de error: `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INTERNAL`.

## Estructura de carpetas

```
app/
  (auth)/login/                    # Login único (sin slug)
  (admin)/                         # Área protegida por NextAuth (OWNER + SUCURSAL_USER)
    layout.tsx                     # Verifica sesión + resuelve sucursal activa + chrome
    calendario/                    # Default landing
    viajes/                        # CRUD + detalle /viajes/[id]
    reservas/, encomiendas/, ...   # Operaciones diarias
    paises/, rutas/, ...           # Mantenimiento
  actions/
    auth.ts                        # signOutAction (única server action que sobrevive)
  api/
    auth/[...nextauth]/            # Handler NextAuth (cookie web)
    v1/                            # REST API (mobile + web)
      auth/, branches/, trips/, reservations/, manifests/, ...

components/
  ui/                              # Primitivos shadcn/ui (Sheet base con ancho responsive)
  agency-sidebar.tsx               # Sidebar principal
  branch-switcher.tsx              # Selector de sucursal (OWNER multi-branch)
  site-header.tsx                  # Header: SidebarTrigger + título sección + user + sucursal
  nav-user.tsx                     # Menú de usuario con logout

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
middleware.ts                      # Gating de rutas (excluye /api/auth, redirect a /login)
prisma.config.ts                   # Connection strings de Prisma v7
types/next-auth.d.ts               # Session.user.{role, branchId}
```

## Roles

| Rol             | `branchId` | Puede                                                   |
|-----------------|------------|---------------------------------------------------------|
| `OWNER`         | `null`     | Todo. Cambia de sucursal vía cookie `active_branch_id`. |
| `SUCURSAL_USER` | requerido  | CRUD scoped a su sucursal. Switcher deshabilitado.      |

No existen `SUPER_ADMIN`, `AGENCY_ADMIN` ni rutas por slug — se eliminaron en el refactor a single-tenant.

## Reglas de negocio importantes

### Viajes

- Un viaje arranca `ABIERTO`. Acepta reservas y modificaciones.
- Cierra a `CERRADO` cuando: tripulación completa + no hay reservas `PENDIENTE` + todos los asientos reservados tienen un pasajero asignado.
- Cerrar bloquea: PATCH/DELETE de reservas, agregar/quitar pasajeros, crear nuevas reservas.
- Un viaje cerrado puede reabrirse con `POST /trips/:id/open` (vuelve a `ABIERTO`).
- El manifiesto se genera solo de viajes cerrados.

### Reservas de pasajeros

- Estado inicial: `PENDIENTE`.
- Pasa a `CONFIRMADA` solo cuando todos los asientos reservados tienen pasajero vinculado.
- `CANCELADA` es reversible (volver a PENDIENTE o CONFIRMADA).
- El proveedor puede ser PERSONA (con datos personales) o EMPRESA (con RIF y contacto).
- Si el proveedor es PERSONA y `seatCount === 1`, el proveedor se auto-vincula como pasajero al crear.

### Tripulantes

- Hasta 3 roles por viaje: `CAPITAN`, `PRIMER_OFICIAL`, `MAQUINISTA`.
- Un tripulante no se puede borrar si está asignado a algún viaje.

### Sucursales

- Una sucursal con usuarios, rutas o viajes asociados no se puede borrar (409).

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
import { api, ApiError } from "@/lib/api/client";
import { useRouter } from "next/navigation";

const router = useRouter();
try {
  await api.trips.create({ ... });
  router.refresh(); // re-render del Server Component padre
} catch (err) {
  toast.error(err instanceof ApiError ? err.message : "Error genérico");
}
```

No se usa `revalidatePath` en el codebase — todas las invalidaciones pasan por `router.refresh()`.

### Logout — `next-auth/react` desde click handlers

```tsx
// components/nav-user.tsx
import { signOut } from "next-auth/react";

onClick={() => signOut({ callbackUrl: "/login", redirect: true })}
```

El `signOutAction` server action existe en `app/actions/auth.ts` pero solo es útil desde forms o transitions, NO desde click handlers (en ese caso el `NEXT_REDIRECT` se traga y la página no navega).

### Sheets — ancho responsive por default

Todos los sheets (`SheetContent` de `components/ui/sheet.tsx`) tienen:
- mobile: `w-full`
- sm+: `max-w-xl`
- md+: `max-w-2xl`
- lg+: `max-w-[45vw]` (~media pantalla)

Para opt-out (sheet más chico), pasar className con `!`:

```tsx
<SheetContent className="sm:max-w-md! md:max-w-md! lg:max-w-md!">
```

## Tests

```bash
# API (Vitest) — requiere DB seedeada en .env.test + dev server corriendo
npm run test

# E2E (Playwright) — requiere dev server corriendo
npm run test:e2e
```

Estado actual:
- **Vitest API**: 4 suites — auth (rotation), branches, trips (open/close), reservations.
- **Playwright E2E**: 3 suites — auth login/logout, branch switcher, trips CRUD lifecycle. 5/8 tests passing; 3 selectores pendientes de ajuste.

## Deuda técnica conocida

- 3 selectores de Playwright que necesitan ajuste post-UI changes: `auth.spec.ts:68` (logout), `branch-switch.spec.ts:94` (dropdown trigger), `trips-crud.spec.ts:180` (form select de branchId).
- `lib/api/response.ts` quedó como dead code después del refactor B20 — se puede borrar.
- `getActiveBranch()` no reescribe el cookie cuando hace fallback a "primera sucursal" tras un id stale (impact: nil, pero el spec lo mencionaba).
- 17 warnings de ESLint informativos (React Compiler + TanStack Table upstream).
- `CrewMember`, `Passenger`, `Proveedor` no tienen `branchId` en el schema → son globales. La spec original los pensó branch-scoped, pero la DB los trata como compartidos entre sucursales (decisión deliberada).
