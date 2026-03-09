# Transport Reservations

Sistema de planificación de viajes de pasajeros y cargamento multi-tenant. Cada agencia opera de forma completamente aislada en su propio slug (subpath URL).

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 App Router · React 19 · TypeScript strict |
| UI | shadcn/ui v4 · Tailwind CSS v4 · Radix UI |
| Forms | React Hook Form v7 · Zod v4 |
| Tablas | TanStack Table v8 |
| Auth | NextAuth.js v5 beta |
| ORM | Prisma v7 (adapter-based, sin `url` en schema) |
| Base de datos | Supabase (PostgreSQL) vía `@prisma/adapter-pg` |
| Notificaciones | Sonner |

## Inicio rápido

> **Requisito previo**: el proyecto de Supabase debe estar activo (no pausado).

```bash
# 1. Variables de entorno
cp .env.example .env   # completar DATABASE_URL, DIRECT_URL, AUTH_SECRET

# 2. Dependencias
npm install

# 3. Base de datos
npx prisma migrate dev
npx prisma db seed

# 4. Desarrollo
npm run dev            # http://localhost:3000
```

## Variables de entorno

```env
DATABASE_URL="postgresql://..."    # connection pooler de Supabase
DIRECT_URL="postgresql://..."      # conexión directa (para migraciones)
AUTH_SECRET="..."                  # clave secreta para NextAuth (openssl rand -base64 32)
```

## Comandos

```bash
npm run dev                        # servidor de desarrollo
npm run build                      # build de producción
npm run lint                       # ESLint

npx prisma generate                # regenerar cliente Prisma
npx prisma migrate dev --name xxx  # crear y aplicar migración
npx prisma db seed                 # insertar datos iniciales
npx prisma studio                  # GUI de base de datos
```

## Credenciales de desarrollo

### Super Admin

| Campo    | Valor              |
|----------|--------------------|
| URL      | `/login`           |
| Email    | `admin@system.com` |
| Password | `Admin1234!`       |

## Estructura de carpetas

```
app/
  (auth)/login/                    # Login del super admin
  (admin-layout)/                  # Layout compartido del área protegida
    layout.tsx                     # Verifica rol SUPER_ADMIN server-side
    super-admin/dashboard/         # Panel del super admin → URL: /super-admin/dashboard
  [slug]/                          # Área por agencia (multi-tenant, pendiente)
  api/auth/[...nextauth]/          # Handler de NextAuth
  actions/
    auth.ts                        # Server Actions de autenticación (signOutAction)

components/
  ui/                              # Primitivos shadcn/ui (no modificar directamente)
  app-sidebar.tsx                  # Sidebar de la aplicación
  data-table.tsx                   # Tabla con TanStack Table

lib/
  db.ts                            # Cliente Prisma singleton (con PrismaPg adapter)
  constants.ts                     # ROUTES — rutas centralizadas de la app
  services/
    user.service.ts                # Queries de usuarios a la DB
  generated/prisma/                # Tipos generados por Prisma (no editar)

auth.ts                            # Configuración NextAuth + callbacks JWT (servidor)
auth.config.ts                     # Proveedor Credentials (edge-compatible)
middleware.ts                      # Protección de rutas
prisma.config.ts                   # Conexión Prisma v7 (DATABASE_URL)
prisma/schema.prisma               # Esquema de la base de datos
types/next-auth.d.ts               # Extensión de tipos Session/JWT
```

## Roles

| Rol            | Acceso                       | Login URL       |
|----------------|------------------------------|-----------------|
| `SUPER_ADMIN`  | Global — gestiona agencias   | `/login`        |
| `AGENCY_ADMIN` | Una agencia — sus sucursales | `/<slug>/login` |
| `AGENCY_USER`  | Una agencia / sucursal       | `/<slug>/login` |

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

### Rutas — usar ROUTES, no strings literales

```ts
import { ROUTES } from "@/lib/constants";

// Correcto
redirect(ROUTES.LOGIN);
router.push(ROUTES.SUPER_ADMIN_DASHBOARD);

// Incorrecto
redirect("/login");
```

### Auth — doble protección

1. **Middleware** (`middleware.ts`): bloquea rutas `/super-admin/*` a nivel edge.
2. **Layout** (`app/(admin-layout)/layout.tsx`): verifica sesión y rol server-side como segunda capa.

### Server Actions

Las mutaciones van en `app/actions/`. Siempre declarar `"use server"` al inicio.

```ts
// app/actions/auth.ts
"use server";
export async function signOutAction() { ... }
```
