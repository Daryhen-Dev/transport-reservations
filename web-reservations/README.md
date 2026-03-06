# Transport Reservations

Sistema de planificación de viajes de pasajeros y cargamento multi-tenant. Cada agencia opera de forma completamente aislada en su propio slug (subpath URL).

## Stack

- **Framework:** Next.js 16 App Router, React 19, TypeScript strict
- **UI:** shadcn/ui + Tailwind CSS v4
- **Forms:** React Hook Form + Zod
- **Backend:** Supabase (PostgreSQL) + Prisma v7
- **Auth:** NextAuth.js v5

## Credenciales

### Super Admin

| Campo    | Valor               |
|----------|---------------------|
| URL      | `/login`            |
| Email    | `admin@system.com`  |
| Password | `Admin1234!`        |

## Comandos

```bash
npm run dev      # Servidor de desarrollo (http://localhost:3000)
npm run build    # Build de producción
npm run start    # Servidor de producción
npm run lint     # ESLint
```

## Base de datos

```bash
npx prisma generate              # Generar cliente Prisma
npx prisma migrate dev           # Crear y aplicar migración
npx prisma db seed               # Insertar datos iniciales (super admin)
```

## Variables de entorno

Crear un archivo `.env` en la raíz con:

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
AUTH_SECRET="..."
```

## Estructura

```
app/
  (auth)/login/              # Login del super admin
  (super-admin)/dashboard/   # Panel del super admin
  [slug]/                    # Área por agencia (multi-tenant)

components/ui/               # Componentes shadcn/ui
lib/db.ts                    # Cliente Prisma (singleton)
auth.ts                      # Configuración NextAuth (servidor)
auth.config.ts               # Configuración NextAuth (edge/middleware)
middleware.ts                # Protección de rutas
prisma/schema.prisma         # Esquema de base de datos
```

## Roles

| Rol           | Acceso                        | Login URL      |
|---------------|-------------------------------|----------------|
| `SUPER_ADMIN` | Global — gestiona agencias    | `/login`       |
| `AGENCY_ADMIN`| Una agencia — sus sucursales  | `/<slug>/login`|
| `AGENCY_USER` | Una agencia / sucursal        | `/<slug>/login`|
