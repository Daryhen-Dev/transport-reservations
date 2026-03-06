# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Project Overview

Sistema de planificación de viajes de pasajeros y cargamento multi-tenant. Cada agencia opera de forma completamente aislada en su propio slug (subpath URL), sin compartir datos con otras agencias.

## Tech Stack

- **Framework:** Next.js 16 App Router, React 19, TypeScript (strict)
- **UI:** shadcn/ui para todos los componentes de interfaz
- **Forms:** Todos los formularios usan **React Hook Form + Zod + shadcn/ui** sin excepción
- **Styles:** Tailwind CSS v4. Los colores del sistema se definen como CSS custom properties en `globals.css` y se consumen desde ahí. No hardcodear colores en componentes.
- **Backend:** Supabase (DB + Storage) con Prisma como ORM
- **Auth:** NextAuth.js
- **Notifications:** Sonner (`<Toaster>`) — siempre posicionado `top-right`. Toda operación de guardado debe notificar éxito o error.
- **Loading:** Toda página que cargue datos remotos debe mostrar un estado de loading mientras espera la respuesta.

## Folder Structure (large project standard)

```
app/
  (auth)/                    # Rutas públicas de auth del super admin
    login/
  (super-admin)/             # Dashboard exclusivo del super admin
    dashboard/
    agencies/
  [slug]/                    # Rutas dinámicas por agencia (tenant)
    (auth)/                  # Login / registro propio de cada agencia
      login/
      register/
    (admin)/                 # Panel del admin de agencia
      dashboard/
      branches/              # Sucursales
      ...
    (agency)/                # Área operativa de la agencia (por definir)

components/
  ui/                        # Componentes shadcn/ui generados (no editar manualmente)
  shared/                    # Componentes reutilizables entre features
  forms/                     # Formularios compuestos (RHF + Zod + shadcn)

lib/
  auth/                      # Configuración NextAuth, helpers de sesión
  db/                        # Cliente Prisma, queries reutilizables
  supabase/                  # Cliente Supabase (server / client)
  validations/               # Schemas Zod compartidos

prisma/
  schema.prisma

hooks/                       # Custom hooks de React
types/                       # Tipos TypeScript globales / compartidos
```

## Hierarchical Roles

| Rol | Scope | Login URL |
|-----|-------|-----------|
| `SUPER_ADMIN` | Global — gestiona todas las agencias | `/login` |
| `AGENCY_ADMIN` | Una agencia — gestiona sucursales y usuarios propios | `/<slug>/login` |
| `AGENCY_USER` | Una agencia / sucursal | `/<slug>/login` |

**Super Admin:**
- Único con acceso a `/super-admin/dashboard`
- Crea agencias: nombre + slug + usuario admin inicial (email + contraseña)
- Ve la lista de agencias registradas y puede agregar más desde la misma pantalla

**Agency Admin:**
- Accede solo a `/<slug>/...`
- Crea y administra sucursales (branches) de su propia agencia

## Multi-Tenant Data Isolation

Cada agencia tiene sus propios registros identificados por `agencyId`. Las queries de Prisma/Supabase **siempre** deben filtrar por el `agencyId` del usuario autenticado. Nunca exponer datos de otras agencias.

## Key Conventions

- Tailwind CSS v4: usar `@import "tailwindcss"` (no directivas `@tailwind base/components/utilities`)
- Los tokens de color se definen en `globals.css` con `@theme inline` y se consumen como clases Tailwind (`bg-background`, `text-foreground`, etc.)
- Dark mode vía `prefers-color-scheme` en variables CSS, no con la variante `dark:` de Tailwind
- Path alias `@/*` apunta a la raíz del proyecto
- Conexión a Supabase en `.env`
