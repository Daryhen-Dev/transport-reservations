# Transport Reservations

Sistema de reservas para **transporte marítimo** — planificación de viajes de pasajeros y encomiendas entre sucursales costeras. Instalación **single-tenant**: una única organización con N sucursales operativas. Diseñado para ser consumido tanto desde la web (NextAuth cookie) como desde una app móvil (JWT Bearer) sobre la misma REST API `/api/v1/*`.

## Funcionalidades actuales

| Área | Estado |
|---|---|
| 🔐 Login web (single page) + logout | ✅ |
| 🔁 Mobile login con JWT + refresh rotación | ✅ |
| 🏢 BranchSwitcher para OWNER multi-sucursal (cookie `HttpOnly`) | ✅ |
| 🧭 Header con título de sección dinámico + user + sucursal activa | ✅ |
| 👥 Usuarios CRUD con roles (`OWNER` / `SUCURSAL_USER`) | ✅ |
| 🌎 Países, Estados de viaje, Tipos de proveedor — catálogos OWNER-only | ✅ |
| 🚏 Sucursales, Rutas, Horarios | ✅ |
| ⚓ Tripulantes (con UX: delete deshabilitado si está en viajes) | ✅ |
| 🚐 Viajes — CRUD + open/close + asignación de tripulación + manifiesto PDF | ✅ |
| 📋 Detalle del viaje `/viajes/[id]` — ruta, tripulación, pasajeros, encomiendas (read-only) | ✅ |
| 🎫 Reservas de pasajeros — comprador PERSONA inline + tipo de precio (NORMAL / REFERIDOS / LIBRE) | ✅ |
| 💰 Tarifas globales fijas: $30 normal, $30 referidos con $5/pax de comisión, $20-$30 libre | ✅ |
| 🛤️ Tramos multi-segmento por ruta — con operadores externos opcionales | ✅ |
| 🔁 Transferir reserva a otra agencia cuando no realizamos el viaje (comisión fija $5/pax) | ✅ |
| 🤝 Reserva transferida directa entre agencias socias — un solo paso desde `/reservas/nueva` | ✅ |
| ✅ Confirm/Cancel reserva — botones explícitos en lista + panel de status en detalle | ✅ |
| 📦 Reservas de encomiendas — proveedor + destinatario + categoría + precio + cobrar en destino | ✅ |
| 📑 Manifiesto del viaje — código generado + PDF descargable con auth | ✅ |
| 📊 Reportes de ventas — KPIs por tipo de comprador / tipo de precio / ruta + CSV con rango | ✅ |
| 💼 Saldos con agencias — libro mayor de pagos con asignación FIFO + tabs Pendientes/Historial | ✅ |
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

El login es único: `/login` (sin slug). El rol y la sucursal se derivan del usuario logueado. El seed también crea las 2 rutas SC ↔ SZ. Las tarifas son globales y viven en `lib/pricing.ts`.

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
| `/tripulacion` | Ambos | Tripulantes (delete bloqueado si tiene viajes) |
| `/rutas` | Ambos | Rutas por sucursal (sin tarifas — son globales) |
| `/rutas/[id]/tramos` | Ambos | Tramos multi-segmento con operadores externos |
| `/horarios` | Ambos | Horarios fijos por ruta |
| `/reportes` | Ambos | KPIs por tipo de comprador / tipo de precio / ruta + CSV |
| `/agencias-balance` | Ambos | Libro mayor por agencia: cargos REFERIDOS + TRANSFERIDA vs pagos |
| `/agencias-balance/[id]` | Ambos | Detalle con tabs Pendientes/Historial + registrar pago + editar notas |
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
| `POST /api/v1/reservations/passengers/:id/transfer` | Transferir reserva a otra agencia (estado → TRANSFERIDA). |
| `POST /api/v1/reservations/passengers/quick-transferred` | Crea reserva directamente en estado TRANSFERIDA en una sola operación. Body: `{scheduleId, date, branchId, proveedorId, transferredToAgencyId, seatCount, passengers[]}`. proveedorId debe ser PERSONA/INSTITUCION; transferredToAgencyId debe ser AGENCIA. Precio fijo $30. Pasajeros obligatorios (length === seatCount). |
| `GET /api/v1/reservations/passengers/:id/receipt` | Recibo PDF (con auth). |
| `GET /api/v1/reservations/passengers/export.csv?branchId=&from=&to=` | Export CSV con filtro por rango. |
| `GET/POST /api/v1/route-segments` · `PATCH/DELETE /:id` | Tramos multi-segmento de una ruta. |
| `GET /api/v1/reports/sales?branchId=&from=&to=` | Agregados de reservas: totales, por tipo de comprador, por tipo de precio, por ruta. |
| `POST /api/v1/agency-payments` | Registra un pago hacia una agencia (parcial o total). Body: `{agencyId, branchId, amount, paymentDate, notes?}`. |
| `PATCH /api/v1/agency-payments/:id` | Edita SOLO las notas de un pago. Monto/fecha no son editables — borrar y registrar de nuevo si hay error. |
| `DELETE /api/v1/agency-payments/:id` | Borra un pago. El saldo recalcula vía FIFO. |
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
    rutas/[id]/tramos/             # Tramos multi-segmento
    reportes/                      # KPIs + agregados
    agencias-balance/              # Libro mayor por agencia + tabs + edición de notas
    paises/, rutas/, ...           # Mantenimiento
  actions/
    auth.ts                        # signOutAction (única server action que sobrevive)
  api/
    auth/[...nextauth]/            # Handler NextAuth (cookie web)
    v1/                            # REST API (mobile + web)
      auth/, branches/, trips/, reservations/, manifests/,
      route-segments/, reports/sales/, agency-payments/, ...

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
  pricing.ts                       # Constantes de precio + PriceType + helpers
  proveedor-types.ts               # Labels + styles de PERSONA/AGENCIA/INSTITUCION_PUBLICA
  serialize.ts                     # Decimals de Prisma → strings antes de cruzar al cliente
  api/
    auth.ts, with-auth.ts          # requireAuth + withAuth wrapper
    client.ts                      # api.* (typed fetch client) usado por el web
    schemas/                       # Zod por recurso (createX/updateX/xQuery)
  services/                        # Lógica de negocio por recurso
    trip.service.ts, reservation.service.ts, ...
    sales-report.service.ts        # Agregaciones del reporte
    agency-balance.service.ts      # Libro mayor con asignación FIFO
  generated/prisma/                # Cliente generado por Prisma (no editar)

prisma/
  schema.prisma                    # Modelos
  seed.ts                          # Catálogos + 2 sucursales + 3 usuarios + 2 rutas
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

Tarifas globales fijas — no hay precios por ruta. Las constantes viven en `lib/pricing.ts`:

| Constante | Valor | Significado |
|---|---|---|
| `PRICE_NORMAL` | $30 | Venta directa al pasajero |
| `PRICE_REFERIDOS` | $30 | Venta con agencia de por medio ($5/pax de comisión) |
| `COMMISSION_PER_PAX` | $5 | Comisión a la agencia referidora por pasajero |
| `PRICE_LIBRE_MIN` / `PRICE_LIBRE_MAX` | $20 / $30 | Rango editable para casos excepcionales |

### Enum `PriceType`

La reserva guarda el tipo de venta como `PassengerReservation.priceType`:

| Tipo | Precio cobrado | Comisión | Editable |
|---|---|---|---|
| `NORMAL` | $30 fijo | — | No |
| `REFERIDOS` | $30 fijo | $5 × seatCount → agencia | No |
| `LIBRE` | $20–$30 | — | Sí (usuario decide) |

### Pre-selección por tipo de proveedor

El selector de tipo de precio se pre-llena según el tipo del proveedor seleccionado:

- **AGENCIA** → `REFERIDOS` **LOCKED** (no editable). La agencia ES el proveedor — la comisión se le paga a ese mismo proveedor.
- **PERSONA / INSTITUCION_PUBLICA** → `NORMAL` default, puede cambiar a `LIBRE`. `REFERIDOS` no aplica porque no hay agencia referidora.

Lógica en `lib/pricing.ts`:
- `defaultPriceTypeForProveedor(proveedorTypeName)` — pre-selección.
- `allowedPriceTypesForProveedor(proveedorTypeName)` — opciones disponibles.
- `isPriceTypeLockedForProveedor(proveedorTypeName)` — si el select queda disabled.

### Snapshot de comisión

`PassengerReservation.commissionAmount` guarda el monto efectivamente pagado a la agencia ($5 × seatCount al momento de crear). Es nullable: solo se setea cuando `priceType = REFERIDOS`. Se persiste como snapshot para que cambios futuros de la constante no reescriban el histórico.

### Tramos multi-segmento (`RouteSegment`)

Una ruta puede tener N tramos en orden. Cada tramo es:
- Propio (lo cubrimos nosotros), o
- **Externo** (lo opera una agencia AGENCIA) — útil para destinos donde no llegamos pero vendemos boletos hasta ahí, ej. SC → Isabela con el tramo SZ → Isabela operado por agencia X.

### Transferir reserva a otra agencia (estado `TRANSFERIDA`)

Cuando no realizamos un viaje (típicamente por pocos pasajeros), cada reserva afectada se puede transferir a una agencia que sí vuela. La reserva original se preserva con sus datos historicos; cambian solo el estado y 3 campos snapshot:
- `transferredToAgencyId` — la agencia destino (debe ser tipo AGENCIA).
- `transferAmountToAgency` — lo que enviamos a la agencia (= `priceAmount × seatCount - $5 × seatCount`).
- `transferCommissionAmount` — lo que retenemos (`$5 × seatCount` fijo, ver `lib/pricing.ts`).

Cash flow concreto con `priceAmount = $30`, `seatCount = N`:
- Cliente nos pagó $30 × N.
- Enviamos a la agencia: $25 × N.
- Comisión que nos quedamos: $5 × N.

Reglas:
- Sólo reservas en estado `PENDIENTE` o `CONFIRMADA` se pueden transferir.
- El viaje origen debe estar `ABIERTO` (no `CERRADO`).
- `TRANSFERIDA` es **terminal** — no se puede revertir. Si te equivocaste, cancelás la transferida y creás una nueva reserva.

### Reserva transferida directa (atajo de un paso)

Cuando nuestro viaje está lleno, mandamos los pasajeros a una agencia socia. Para no obligar a hacer el flujo "crear reserva → transferir" en dos pasos, hay un atajo en `/reservas/nueva` (botón "Pasajero transferido") que crea la reserva ya en estado `TRANSFERIDA`.

**Restricciones específicas del atajo:**
- El proveedor (comprador) debe ser **PERSONA o INSTITUCION_PUBLICA**. AGENCIA queda bloqueada — un comprador agencia generaría cruces de comisiones extraños.
- Sólo se elige **una** agencia: el destino (`transferredToAgency`).
- Precio fijo de **$30** (NORMAL), sin opción LIBRE en este flujo.
- Los **pasajeros son obligatorios**: la cantidad de pasajeros define el `seatCount`. Se registran porque esos datos se comparten con la agencia destino (cruce de información entre agencias). La carga usa el mismo patrón que "gestionar reserva": un autocomplete que busca pasajeros existentes (`api.passengers.search`) y, si no existe, un botón "Crear nuevo pasajero" que abre un sheet (`QuickPassengerCreateSheet`) que lo crea en la BD vía `api.passengers.create` y lo agrega a la lista.

**Cash flow** (con `priceAmount = $30`, `seatCount = N`):
- Enviado al destino: $25 × N (= price − transfer commission).
- Comisión que retenemos: $5 × N (`TRANSFER_COMMISSION_PER_PAX`).
- El comprador no genera comisión REFERIDOS (no es agencia), así que `commissionAmount` queda en null.

**Endpoint atómico**: `POST /api/v1/reservations/passengers/quick-transferred` combina la lógica de `/quick` (find-or-create trip) con la de `/transfer` (set TRANSFERIDA + transfer fields) + el upsert/link de pasajeros, todo en una transacción. Valida que el comprador NO sea AGENCIA, que el destino SÍ lo sea, y que `passengers.length === seatCount`.

**Validación en el `/transfer` manual**: el endpoint `POST /reservations/passengers/:id/transfer` (botón "Transferir" en la tabla) también rechaza reservas con proveedor AGENCIA, y el botón se oculta en la UI cuando el comprador es agencia.

**Reflejo en saldos**: el destino aparece con $25/pax adeudado (`transferAmount`) en `/agencias-balance`. El comprador no es agencia, así que no figura ahí.

### Saldos con agencias (`AgencyPayment` + FIFO)

Las agencias generan deuda hacia ellas en dos escenarios:
- **REFERIDOS**: cada reserva donde el proveedor es la agencia genera un cargo de `commissionAmount` ($5 × seatCount).
- **TRANSFERIDA**: cada reserva transferida a la agencia genera un cargo de `transferAmountToAgency` ($25 × seatCount con la constante actual).

Los pagos se registran en la tabla `AgencyPayment` (libro mayor separado, no se modifica la reserva). Cada pago es agency-level con monto, fecha y nota opcional. Soporta **liquidaciones parciales** — podés registrar 3 pagos de $50 distintos hasta cubrir un cargo de $150, o un pago consolidado de $500 que cubre múltiples reservas.

**Asignación FIFO**: el sistema no obliga a asignar cada pago a una reserva específica. Al calcular el estado de cada cargo, se ordenan cronológicamente del más viejo al más nuevo y se "consume" el pool total de pagos. Cada cargo termina con uno de tres estados:
- **`PAID`** — totalmente cubierto.
- **`PARTIAL`** — parcialmente cubierto (el resto va al siguiente).
- **`PENDING`** — sin pagos aplicados.

Implementado en `lib/services/agency-balance.service.ts:getAgencyBalanceDetail()`.

**UI** (`/agencias-balance` + `/agencias-balance/[id]`):
- Index lista todas las agencias con actividad + saldo neto.
- Detail con tabs:
  - **Pendientes** (default): sólo cargos `PARTIAL` + `PENDING`. Es lo que el operador necesita ver para pagar a fin de mes.
  - **Historial**: todos los cargos con badges + tabla de pagos con editar notas / eliminar.
- Click en row de cargo despliega lista de pasajeros vinculados.

**Edición de pagos**: sólo las notas son editables (`PATCH /api/v1/agency-payments/:id`). Monto y fecha son inmutables — si te equivocaste, borrás y registrás de nuevo. Decisión deliberada: el monto y fecha son "datos del hecho real" que no deberían cambiar.

**Saldo negativo**: si cancelás una reserva DESPUÉS de haberle pagado a la agencia, el saldo neto queda negativo y el card del header se marca en rojo. El operador lo corrige eliminando el pago original (FIFO recalcula). Solución experimental — esperamos uso real para validar.

## Reglas de negocio importantes

### Viajes

- Un viaje arranca `ABIERTO`. Acepta reservas y modificaciones.
- Cierra a `CERRADO` cuando: capitán asignado + no hay reservas `PENDIENTE` + todos los asientos reservados tienen un pasajero asignado.
- Cerrar bloquea: PATCH/DELETE de reservas, agregar/quitar pasajeros, crear nuevas reservas, modificar tripulación.
- Un viaje cerrado puede reabrirse con `POST /trips/:id/open` (vuelve a `ABIERTO`).
- El manifiesto se genera solo de viajes cerrados.

### Reservas de pasajeros

- Estado inicial: `PENDIENTE`.
- Pasa a `CONFIRMADA` solo cuando todos los asientos reservados tienen pasajero vinculado.
- `CANCELADA` es reversible (volver a PENDIENTE o CONFIRMADA).
- `TRANSFERIDA` es **terminal** — se llega solo via `POST .../transfer` (ver "Transferir reserva a otra agencia").
- El sheet inline solo crea comprador PERSONA. Para AGENCIA / INSTITUCION_PUBLICA, primero se crea el proveedor en `/proveedores` y se usa el flujo "Nueva reserva rápida" desde el calendario.
- Si el comprador es PERSONA y `seatCount === 1`, el comprador se auto-vincula como pasajero al crear.
- El precio cobrado lo determina `priceType` (ver "Modelo de pricing"). El server valida que el tipo elegido sea válido para el tipo del proveedor.

### Reservas de encomiendas

- Categoría obligatoria (DOCUMENTOS, ELECTRONICA, ALIMENTOS, ROPA, MEDICAMENTOS, OTROS).
- Sin dimensiones (se eliminó por excesivo).
- Soporta `cobrarEnDestino` para flujo "el destinatario paga cuando retira".
- Estado doble: `reservationStatus` (PENDIENTE/CONFIRMADA/CANCELADA/TRANSFERIDA) + `cargoStatus` (EN TRANSITO/ENTREGADA/NO RECLAMADA/DEVUELTA).

### Tripulantes

- Tripulación variable por viaje. Dos roles en el catálogo: `CAPITAN` y `TRIPULANTE`.
- **`CAPITAN`**: máximo 1 por viaje. Obligatorio para cerrar el viaje.
- **`TRIPULANTE`**: 0 a 2 por viaje. Opcional.
- Mínimo absoluto = 1 persona (el capitán). Configuraciones válidas: solo capitán; capitán + 1 tripulante; capitán + 2 tripulantes.
- El mismo `CrewMember` no se puede asignar dos veces al mismo viaje (constraint de PK).
- Un tripulante no se puede borrar si está asignado a algún viaje.
- No se puede asignar a un tripulante a dos viajes que salen dentro de ±4 horas entre sí (regla anti-overlap).

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
  serializePassengerReservation,
  serializeCargoReservation,
} from "@/lib/serialize";

// En cualquier page que pasa data al cliente
const serializedReservations = reservations.map(serializePassengerReservation);
```

Los helpers preservan el resto del shape y convierten los Decimals (`priceAmount`, `commissionAmount`) con `.toString()` → `string | null`. `Route` ya no tiene Decimals propias — pasa plana sin helper.

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
- `20260602100000_pricing_constants_v2` — dropeó tarifas por ruta + `ProveedorTariff` + agregó enum `PriceType` con backfill (`REFERIDOS` para reservas con `referredByAgencyId`, `NORMAL` para el resto).
- `20260602110000_proveedor_email_required` — agregó `email` NOT NULL UNIQUE a `Proveedor` (wipe de proveedores existentes + cascada, porque no tenían email).
- `20260602120000_transfer_to_agency` — dropeó `ExternalSale` (nunca se usó), agregó estado `TRANSFERIDA` + 3 campos snapshot en `PassengerReservation` para registrar transferencias a otra agencia.
- `20260602130000_variable_crew` — pasó de 3 roles fijos (`CAPITAN`/`PRIMER_OFICIAL`/`MAQUINISTA`) a 2 roles variables (`CAPITAN` + `TRIPULANTE` 0-2). Dropeó el unique constraint `(tripId, crewRoleId)` y migró asignaciones legacy a `TRIPULANTE`.
- `20260603100000_agency_payment_ledger` — creó tabla `AgencyPayment` para el libro mayor de pagos a agencias (saldos calculados al vuelo vía FIFO).

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
- La edición de reservas existentes (`/reservas/[id]`) solo permite cambiar viaje, asientos y status. `priceType` / `priceAmount` quedan congelados al crear — si hace falta corregir, se cancela y se vuelve a crear.
- Reportes no tiene export CSV propio aún (las reservas regulares sí — incluye columnas de transferencia).
