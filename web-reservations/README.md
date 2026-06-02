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
| 🚏 Sucursales, Rutas (con tarifas), Horarios | ✅ |
| ⚓ Tripulantes (con UX: delete deshabilitado si está en viajes) | ✅ |
| 🚐 Viajes — CRUD + open/close + asignación de tripulación + manifiesto PDF | ✅ |
| 📋 Detalle del viaje `/viajes/[id]` — ruta, tripulación, pasajeros, encomiendas (read-only) | ✅ |
| 🎫 Reservas de pasajeros — comprador PERSONA inline + precio + comisión opcional | ✅ |
| 💰 Precio sugerido derivado del tipo de proveedor (directo / tarifa de agencia) | ✅ |
| 🏷️ Tarifas negociadas por proveedor que sobrescriben las defaults de la ruta | ✅ |
| 🛤️ Tramos multi-segmento por ruta — con operadores externos opcionales | ✅ |
| 🛒 Ventas externas (intermediación) — no consumen asiento de nuestros viajes | ✅ |
| ✅ Confirm/Cancel reserva — botones explícitos en lista + panel de status en detalle | ✅ |
| 📦 Reservas de encomiendas — proveedor + destinatario + categoría + precio + cobrar en destino | ✅ |
| 📑 Manifiesto del viaje — código generado + PDF descargable con auth | ✅ |
| 📊 Reportes de ventas — KPIs por tipo de comprador / agencia referida / ruta + CSV con rango | ✅ |
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
| PDFs | `@react-pdf/renderer` (manifiestos + recibos de reserva) |
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

# 3. Base de datos
npx prisma migrate dev       # aplica todas las migraciones
npx prisma db seed           # seed (idempotente — se puede correr varias veces)

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

Si `.env.local` existe, se usa. Si no, `.env`. **Next.js carga `.env.local` solo**, pero Prisma necesita el override explícito que está en `prisma.config.ts`.

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
npx prisma migrate dev --name xxx  # crear y aplicar migración
npx prisma migrate deploy          # aplicar migraciones pendientes (no interactivo)
npx prisma db seed                 # insertar datos iniciales (idempotente)
npx prisma studio                  # GUI de base de datos
npx prisma generate                # regenerar el cliente (después de cambiar schema)
```

## Credenciales sembradas (post `prisma db seed`)

| Rol             | Email                          | Password      | Sucursal       |
|-----------------|--------------------------------|---------------|----------------|
| `OWNER`         | `owner@system.com`             | `Admin1234!`  | (todas)        |
| `SUCURSAL_USER` | `sancristobal@system.com`      | `User1234!`   | San Cristóbal  |
| `SUCURSAL_USER` | `santacruz@system.com`         | `User1234!`   | Santa Cruz     |

El login es único: `/login` (sin slug). El rol y la sucursal se derivan del usuario logueado. El seed también crea las 2 rutas SC ↔ SZ con tarifas default ($30 / $25 / $5 / $15).

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
| `/proveedores` | Ambos | Proveedores PERSONA / AGENCIA / INSTITUCION_PUBLICA |
| `/proveedores/[id]/tarifas` | Ambos | Tarifas negociadas por proveedor (solo AGENCIA) |
| `/tripulacion` | Ambos | Tripulantes (delete bloqueado si tiene viajes) |
| `/rutas` | Ambos | Rutas por sucursal con tarifas |
| `/rutas/[id]/tramos` | Ambos | Tramos multi-segmento con operadores externos |
| `/horarios` | Ambos | Horarios fijos por ruta |
| `/ventas-externas` | Ambos | Intermediación — boletos que no usan nuestros asientos |
| `/reportes` | Ambos | KPIs por tipo de comprador / agencia referida / ruta + CSV |
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
| `GET /api/v1/manifests/:code` · `GET /api/v1/manifests/:code/pdf` | Lookup JSON / PDF (con auth). |
| `POST /api/v1/reservations/passengers/:id/passengers` | Vincular pasajero (crear+link o link existente). |
| `PATCH /api/v1/reservations/passengers/:id/status` | Cambiar estado: PENDIENTE / CONFIRMADA / CANCELADA. |
| `GET /api/v1/reservations/passengers/:id/receipt` | Recibo PDF (con auth). |
| `GET /api/v1/reservations/passengers/export.csv?branchId=&from=&to=` | Export CSV con filtro por rango. |
| `GET/POST /api/v1/proveedor-tariffs` · `PATCH/DELETE /:id` | Tarifas override por proveedor + ruta. |
| `GET/POST /api/v1/route-segments` · `PATCH/DELETE /:id` | Tramos multi-segmento de una ruta. |
| `GET/POST /api/v1/external-sales` · `GET/PATCH/DELETE /:id` | Ventas externas (intermediación). |
| `GET /api/v1/reports/sales?branchId=&from=&to=` | Agregados de reservas: totales, por tipo de comprador, por agencia referida, por ruta. |
| `GET /api/v1/calendar?year=&month=&branchId=` | Datos del calendario. |

Todas las respuestas siguen el envelope `{ data }` (éxito) o `{ error: { code, message, details? } }` (fallo). Códigos de error: `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INTERNAL`.

## Estructura de carpetas

```
app/
  (auth)/login/                    # Login único (sin slug)
  (admin)/                         # Área protegida por NextAuth (OWNER + SUCURSAL_USER)
    layout.tsx                     # Verifica sesión + resuelve sucursal activa + chrome
    calendario/, dashboard/        # Default landing + resumen
    viajes/                        # CRUD + detalle /viajes/[id]
    reservas/, encomiendas/        # Operaciones diarias
    proveedores/[id]/tarifas/      # Tarifas negociadas (solo AGENCIA)
    rutas/[id]/tramos/             # Tramos multi-segmento
    ventas-externas/               # Intermediación (sin Trip asociado)
    reportes/                      # KPIs + agregados
    paises/, rutas/, ...           # Mantenimiento
  actions/
    auth.ts                        # signOutAction (única server action que sobrevive)
  api/
    auth/[...nextauth]/            # Handler NextAuth (cookie web)
    v1/                            # REST API (mobile + web)
      auth/, branches/, trips/, reservations/, manifests/,
      proveedor-tariffs/, route-segments/, external-sales/,
      reports/sales/, ...

components/
  ui/                              # Primitivos shadcn/ui (Sheet base con ancho responsive)
  agency-sidebar.tsx               # Sidebar principal
  branch-switcher.tsx              # Selector de sucursal (OWNER multi-branch)
  site-header.tsx                  # Header: SidebarTrigger + título sección + user + sucursal
  nav-user.tsx                     # Menú de usuario con logout
  proveedor-type-badge.tsx         # Badge con estilo por tipo de proveedor

lib/
  db.ts                            # Cliente Prisma singleton (PrismaPg adapter)
  branch-context.ts                # getActiveBranch / requireActiveBranch
  constants.ts                     # ROUTES (flat, sin slug)
  proveedor-types.ts               # Labels + styles de PERSONA/AGENCIA/INSTITUCION_PUBLICA
  serialize.ts                     # Decimals de Prisma → strings antes de cruzar al cliente
  api/
    auth.ts, with-auth.ts          # requireAuth + withAuth wrapper
    client.ts                      # api.* (typed fetch client) usado por el web
    schemas/                       # Zod por recurso (createX/updateX/xQuery)
  services/                        # Lógica de negocio por recurso
    trip.service.ts, reservation.service.ts, ...
    tariff.service.ts              # resolveTariff + suggestedForProveedorType
    sales-report.service.ts        # Agregaciones del reporte
  generated/prisma/                # Cliente generado por Prisma (no editar)

prisma/
  schema.prisma                    # Modelos
  seed.ts                          # Catálogos + 2 sucursales + 3 usuarios + 2 rutas con tarifas
  migrations/                      # Una serie de migraciones evolutivas

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

## Modelo de pricing

El sistema maneja **tres tipos de venta** según quién es el comprador y dónde vuela el pasajero.

### Tarifas en `Route`

Cada ruta tiene 4 montos default:

| Campo | Significado | Default seed |
|---|---|---|
| `directPriceAmount` | Precio para comprador PERSONA | $30.00 |
| `incomingAgencyPriceAmount` | Precio para comprador AGENCIA / INSTITUCION_PUBLICA | $25.00 |
| `outgoingCommissionAmount` | Referencia para comisión a referidos | $5.00 |
| `minPrice` | Piso absoluto del precio cobrado | $15.00 |

### Precio sugerido en reservas internas

El precio sugerido sale del **tipo del comprador** (no de un dropdown):

- **PERSONA** → `directPriceAmount` ($30)
- **AGENCIA / INSTITUCION_PUBLICA** → `incomingAgencyPriceAmount` ($25)

El operador puede editar el precio cobrado, con piso en `minPrice`. El sugerido queda como snapshot histórico en la reserva (`suggestedAmount`).

### Override por proveedor

`ProveedorTariff` permite sobrescribir las 4 columnas por (proveedor, ruta). Útil para agencias frecuentes con precios negociados. Si una columna del override es `null`, se usa la default de la ruta. Resuelto en `lib/services/tariff.service.ts:resolveTariff()`.

### Referido por agencia (comisión opcional)

Cualquier reserva puede registrar:
- `referredByAgencyId` — la agencia que trajo el cliente (debe ser tipo AGENCIA).
- `commissionAmount` — lo que le pagamos a esa agencia por la referencia.

Es independiente del tipo del comprador. Aparece en el sheet como un selector opcional.

### Tramos multi-segmento (`RouteSegment`)

Una ruta puede tener N tramos en orden. Cada tramo es:
- Propio (lo cubrimos nosotros), o
- **Externo** (lo opera una agencia AGENCIA) — útil para destinos donde no llegamos pero vendemos boletos hasta ahí, ej. SC → Isabela con el tramo SZ → Isabela operado por agencia X.

### Ventas externas (`ExternalSale`)

Cuando vendemos un boleto **operado completamente por otra agencia**, la venta NO ocupa asiento en ningún `Trip` nuestro. Vive en una entidad aparte con:
- `operatorAgency` (obligatorio, tipo AGENCIA)
- `branch` (sucursal donde se hizo la venta)
- `origin` / `destination` (texto libre, la ruta puede no existir en nuestro catálogo)
- `priceCharged` (lo que cobramos al cliente)
- `costPaidToOperator` (lo que pagamos a la agencia)
- Margen = `priceCharged - costPaidToOperator` (calculado en UI)

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
- El sheet inline solo crea comprador PERSONA. Para AGENCIA / INSTITUCION_PUBLICA, primero se crea el proveedor en `/proveedores` y se usa el flujo "Nueva reserva rápida" desde el calendario.
- Si el comprador es PERSONA y `seatCount === 1`, el comprador se auto-vincula como pasajero al crear.
- El precio cobrado tiene piso en `minPrice` (ya sea el de la ruta o el del override por proveedor).

### Reservas de encomiendas

- Categoría obligatoria (DOCUMENTOS, ELECTRONICA, ALIMENTOS, ROPA, MEDICAMENTOS, OTROS).
- Sin dimensiones (se eliminó por excesivo).
- Soporta `cobrarEnDestino` para flujo "el destinatario paga cuando retira".
- Estado doble: `reservationStatus` (PENDIENTE/CONFIRMADA/CANCELADA) + `cargoStatus` (EN TRANSITO/ENTREGADA/NO RECLAMADA/DEVUELTA).

### Tripulantes

- Hasta 3 roles por viaje: `CAPITAN`, `PRIMER_OFICIAL`, `MAQUINISTA`.
- Un tripulante no se puede borrar si está asignado a algún viaje.

### Sucursales

- Una sucursal con usuarios, rutas o viajes asociados no se puede borrar (409).

### Tipos de proveedor

Solo existen 3 tipos: `PERSONA`, `AGENCIA`, `INSTITUCION_PUBLICA`. El tipo `EMPRESA` fue retirado del catálogo — los proveedores existentes fueron migrados a `AGENCIA`.

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

### Decimals → strings antes de cruzar al cliente

Next.js 16 rechaza objetos `Decimal` de Prisma cuando pasan de Server Component a Client Component. Usar los helpers en `lib/serialize.ts`:

```ts
import {
  serializeRoute,
  serializeTrip,
  serializePassengerReservation,
  serializeCargoReservation,
} from "@/lib/serialize";

// En cualquier page que pasa data al cliente
const serializedTrips = trips.map(serializeTrip);
const serializedReservations = reservations.map(serializePassengerReservation);
```

Los helpers preservan el resto del shape y convierten los Decimals con `.toString()` → `string | null`.

### Auth — dual transport en una sola función

`requireAuth(req)` decide automáticamente entre Bearer y cookie. Los handlers NO discriminan transporte.

```ts
// app/api/v1/<resource>/route.ts
import { withAuth } from "@/lib/api/with-auth";

export const GET = withAuth(async (_req, { auth }) => {
  // auth = { userId, role, branchId, transport: "bearer" | "cookie" }
  return NextResponse.json({ data: ... });
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

### Migraciones con datos existentes

Cuando hay que dropear o renombrar columnas que ya tienen filas, Prisma se vuelve interactivo y refuse en non-TTY. Patrón:

```bash
# 1. Crear el directorio manualmente con el SQL custom
mkdir prisma/migrations/<timestamp>_<name>
# 2. Escribir migration.sql con las sentencias (UPDATE + DROP + ADD + DEFAULT temporal si hace falta)
# 3. Aplicar con deploy (no requiere TTY)
PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION=YES npx prisma migrate deploy
```

Ejemplos en `prisma/migrations/`:
- `20260601232009_drop_empresa_provider_type` — reasignó EMPRESA → AGENCIA antes de borrar el tipo.
- `20260602000000_reservation_referral_commission` — dropeó enum `SalesChannel` + agregó `referredByAgencyId` y `commissionAmount`.

## Tests

```bash
# API (Vitest) — requiere DB seedeada en .env.test + dev server corriendo
npm run test

# E2E (Playwright) — requiere dev server corriendo
npm run test:e2e
```

Estado actual:
- **Vitest API**: 4 suites — auth (rotation), branches, trips (open/close), reservations.
- **Playwright E2E**: 3 suites — auth login/logout, branch switcher, trips CRUD lifecycle.

## Deuda técnica conocida

- 3 selectores de Playwright que necesitan ajuste post-UI changes: `auth.spec.ts:68` (logout), `branch-switch.spec.ts:94` (dropdown trigger), `trips-crud.spec.ts:180` (form select de branchId).
- `lib/api/response.ts` quedó como dead code después del refactor B20 — se puede borrar.
- `getActiveBranch()` no reescribe el cookie cuando hace fallback a "primera sucursal" tras un id stale (impact: nil).
- 17 warnings de ESLint informativos (React Compiler + TanStack Table upstream).
- `CrewMember`, `Passenger`, `Proveedor` no tienen `branchId` en el schema → son globales. La spec original los pensó branch-scoped, pero la DB los trata como compartidos entre sucursales (decisión deliberada).
- La edición de reservas existentes (`/reservas/[id]`) acepta `priceAmount` / `referredByAgencyId` / `commissionAmount` por API (PATCH), pero el formulario UI aún no expone esos campos — solo permite cambiar viaje, asientos y status.
- Reportes y `ExternalSale` no tienen export CSV propio aún (las reservas regulares sí).
