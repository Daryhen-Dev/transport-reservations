# Portales cliente y proveedor — Planificación futura

> **Estado**: planificado, no implementado. Decisiones clave pendientes.
> **Última actualización**: 2026-05-29
> **Owner del documento**: Daryhen

## Resumen ejecutivo

Dos features nuevas que extienden el sistema más allá del uso interno (OWNER + SUCURSAL_USER):

1. **Portal público de consulta** — Cualquier persona, sin login, consulta el estado de su reserva usando un código (y posiblemente verificación adicional). Pensado para que el comprador final pueda confirmar datos del viaje sin depender de la sucursal.

2. **Portal autenticado para proveedores** — Los proveedores (PERSONA o EMPRESA) se loguean con credenciales propias para ver SUS viajes/reservas y un dashboard de "aportaciones" (cuánto le han generado a la empresa).

Ambas son independientes pero comparten infra (login flow, layout simple) — se pueden implementar en orden o en paralelo.

---

## Parte 1 — Portal público de consulta

### Objetivo

Un comprador (proveedor PERSONA o EMPRESA) entrega un dato a quien viaja y este último puede consultar online el estado de su reserva sin necesidad de cuenta.

### Casos de uso

- Confirmar fecha/hora/ruta antes del viaje.
- Verificar que la reserva esté CONFIRMADA (no PENDIENTE).
- Consultar el código del manifiesto si el viaje ya cerró.
- (Opcional) Descargar el recibo PDF.

### Decisiones clave pendientes

| # | Decisión | Opciones | Tradeoff |
|---|---|---|---|
| 1.1 | **Llave de consulta** | (a) Código `PR-XXXXXXXX` solamente<br>(b) Número de documento solamente<br>(c) Ambos como verificación cruzada<br>(d) Código + apellido como verificación | (a) simple; (b) cómodo para frecuentes pero cualquiera con un documento puede consultar; (c) y (d) más seguro |
| 1.2 | **Reservas visibles** | Solo próximas / Próximas + últimos 7 días / Todas | Más restrictivo = más privacidad. Por defecto recomendar próximas. |
| 1.3 | **Datos expuestos** | Resumen básico (ruta, fecha, estado, sucursal, asientos) / + pasajeros vinculados / + descarga recibo PDF | Mostrar pasajeros expone datos personales. Recibo PDF también. |
| 1.4 | **Throttling** | Sin rate limit / Rate limit por IP | Sin rate limit habilita brute force. **Crítico implementar** dado que es público. |
| 1.5 | **Logging de accesos** | Sí / No | Sí: registrar qué código se consultó, qué IP, qué hora — útil para detectar abuso. |

**Recomendación inicial**: opción (c) o (d) para máxima seguridad, mostrar resumen básico sin pasajeros, rate limit por IP, log de accesos.

### Esbozo técnico

- **Ruta**: `/consulta` (pública, fuera del grupo `(admin)`).
- **Endpoint**: `POST /api/v1/public/reservation/lookup` con body `{ code, document }`. POST para no exponer el código en URL/logs.
- **Middleware**: excluir `/consulta` y `/api/v1/public/*` del gate de autenticación (igual que `/login` y `/api/auth`).
- **Rate limit**: middleware con bucket por IP (sliding window, 5 intentos por minuto sugerido).
- **Vista**: una sola página con form grande tipo "Ingrese su código de reserva" + tarjeta de resultado abajo.
- **Logging**: tabla nueva `ConsultationLog { code, ipHash, timestamp, success }` para auditoría.

### Riesgos

- **Privacidad**: con código solo, cualquiera que vea una foto del recibo en WhatsApp puede consultar. Verificación cruzada mitiga.
- **Brute force**: el código actual es 8 hex chars (~256M combinaciones). Con rate limit es manejable.
- **Cosecha de datos**: aunque no haya brute force, alguien podría obtener códigos de otras formas (ej. pedir recibos a clientes legítimos). Mostrar mínimo de datos por defecto.

### Esfuerzo estimado

**1-2 días** (endpoint + página + middleware + rate limit + logging).

---

## Parte 2 — Portal autenticado para proveedores

### Objetivo

Los proveedores (entidades que ya existen en el sistema como compradores de reservas) pueden tener cuenta propia para autoservicio: ver sus reservas, dashboard de aportaciones, etc.

### Casos de uso

- Un proveedor frecuente (agencia, particular que viaja mucho) quiere ver el historial de sus reservas sin llamar a la sucursal.
- Una empresa quiere medir cuánto ha contribuido al negocio (volumen de reservas, asientos vendidos, encomiendas, etc.) para fines internos.
- (Futuro) El proveedor crea reservas directamente desde su portal.

### Decisiones clave pendientes

| # | Decisión | Opciones | Recomendación |
|---|---|---|---|
| 2.1 | **Modelo de cuenta** | (a) Email + password en la tabla `Proveedor` directamente<br>(b) Modelo nuevo `ProveedorUser` con FK a `Proveedor` | (b) Más limpio. Una EMPRESA puede tener N usuarios (gerente + vendedores) compartiendo el mismo `Proveedor`. |
| 2.2 | **Quién crea la cuenta** | (a) Activación manual por OWNER/SUCURSAL_USER<br>(b) Auto-registro con verificación de email | (a) MVP. Auto-registro requiere infra de email (no la tenemos hoy). |
| 2.3 | **Definición de "aportaciones"** | (a) Reservas generadas (count)<br>(b) Asientos vendidos<br>(c) Volumen monetario ($)<br>(d) Comisiones<br>(e) Encomiendas + peso<br>(f) Combinación | **PENDIENTE confirmar con stakeholder**. (c) y (d) requieren modelo de precios — hoy no existe. (a), (b), (e) son inmediatas. |
| 2.4 | **Roles** | (a) Nuevo rol `PROVEEDOR_USER` en la tabla `Role` existente<br>(b) Modelo de auth separado, sin tocar `Role` | (a) Reusa NextAuth con un check adicional. |
| 2.5 | **Login compartido o separado** | (a) `/login` único con detección de rol y redirect<br>(b) `/proveedor/login` dedicado | (b) UX más claro: separar dominios evita confusión. |
| 2.6 | **Multi-usuario por proveedor** | (a) 1 cuenta = 1 proveedor (rígido)<br>(b) N cuentas por proveedor, todas ven los mismos datos<br>(c) N cuentas con sub-permisos | (b) MVP. (c) requiere modelo de sub-permisos, demasiado para empezar. |
| 2.7 | **Capacidades en MVP** | Solo lectura / Lectura + editar datos personales / Lectura + crear reservas | Solo lectura para MVP. |

### Definición pendiente: "aportaciones"

Necesario clarificar con el stakeholder antes de implementar. Mientras tanto, el MVP del dashboard podría mostrar las 3 métricas inmediatamente disponibles:

- Total de reservas confirmadas en último período.
- Total de asientos vendidos (suma de `seatCount` de reservas no canceladas).
- Total de encomiendas + suma de peso.

Después se puede agregar (c) o (d) cuando entre el modelo de precios.

### Esbozo técnico (asumiendo modelo `ProveedorUser`)

#### Schema

```prisma
model ProveedorUser {
  id           String   @id @default(cuid())
  email        String   @unique
  password     String
  proveedorId  String
  proveedor    Proveedor @relation(fields: [proveedorId], references: [id])
  createdById  String?      // OWNER/SUCURSAL_USER que activó la cuenta
  createdBy    User?        @relation("ProveedorUserCreatedBy", ...)
  isActive     Boolean      @default(true)
  refreshTokens ProveedorRefreshToken[]
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
}

model Proveedor {
  // ... campos existentes
  users        ProveedorUser[]
}
```

Alternativa más simple: extender `User` con `proveedorId` opcional y agregar rol `PROVEEDOR_USER`. Más acoplado pero menos código.

#### Auth

- NextAuth Credentials provider con segunda estrategia, o un solo provider que chequee primero `User` y después `ProveedorUser`.
- JWT con claim `role: PROVEEDOR_USER` + `proveedorId`.
- `requireAuth` distingue por role.

#### Endpoints nuevos

```
GET  /api/v1/proveedor/me                          - Datos del proveedor logueado
GET  /api/v1/proveedor/me/reservations?status=...  - Sus reservas filtradas
GET  /api/v1/proveedor/me/cargo                    - Sus encomiendas
GET  /api/v1/proveedor/me/dashboard                - KPIs de aportaciones
PATCH /api/v1/proveedor/me                         - Actualizar sus datos (opcional)
```

Todos branch-agnostic (un proveedor opera con varias sucursales).

#### Rutas web

```
/proveedor/login       - Form de login dedicado
/proveedor/dashboard   - Cards de aportaciones
/proveedor/reservas    - Tabla de reservas con filtros
/proveedor/encomiendas - Tabla de encomiendas
/proveedor/perfil      - Datos personales / cambio de password
```

Layout simplificado: sin sidebar admin, top bar mínimo con nombre + logout.

#### Middleware

Extender el matcher para que `/proveedor/*` también esté autenticado pero con rol distinto. O grupo de rutas `(proveedor)` con su propio gate.

### Riesgos

- **Scope creep**: el portal puede crecer rápido (notificaciones, edición, autoservicio de reservas, recibos descargables, etc.). Definir MVP estricto.
- **Privacidad cross-proveedor**: un proveedor NO debe ver datos de otros proveedores ni de pasajeros que no le pertenecen.
- **Compartir cuenta**: si 3 vendedores de una EMPRESA comparten cuenta, hay riesgo de mala atribución. Multi-usuario por proveedor (decisión 2.6.b) lo resuelve pero agrega gestión.
- **Audit cross-roles**: ya tenemos `createdById` en reservas — apuntando a `User`. Si un proveedor crea una reserva (Fase 2), necesitamos un campo o estrategia para apuntar al `ProveedorUser`.

### Esfuerzo estimado

| Fase | Estimación |
|---|---|
| **MVP solo lectura** (auth + 3 páginas + endpoints + dashboard básico) | 4-6 días |
| **+ Edición de datos personales** | +1 día |
| **+ Auto-registro con verificación email** | +2-3 días (requiere infra de email) |
| **+ Crear reservas desde el portal** | +3-5 días |

---

## Plan sugerido de implementación

### Fase 0 — Pre-requisitos

- Implementar **rate limiting** general en el API (no solo para esto). Útil para producción de cualquier forma.
- Decidir infra de **logging/observability** si vamos a registrar accesos públicos.

### Fase 1 — Portal público de consulta

Más simple y entrega valor inmediato. Independiente del resto.

1. Decidir 1.1, 1.2, 1.3, 1.4, 1.5.
2. Migration: `ConsultationLog` (si aplica).
3. Middleware: excluir `/consulta` y `/api/v1/public/*`.
4. Endpoint `POST /api/v1/public/reservation/lookup` con rate limit.
5. Página `/consulta` con form + result.
6. Tests.

**Estimación**: 1-2 días.

### Fase 2 — Portal proveedor solo lectura (MVP)

1. Confirmar 2.1 (modelo de cuenta), 2.3 (definición de aportaciones), 2.5 (login compartido o separado).
2. Migration: `ProveedorUser` + `ProveedorRefreshToken` + relación a `Proveedor`.
3. Backend: extender NextAuth, agregar rol `PROVEEDOR_USER`, endpoints `/api/v1/proveedor/me/*`.
4. Frontend: layout `(proveedor)`, login dedicado, dashboard, lista de reservas, perfil read-only.
5. UI en el admin: botón "Habilitar acceso" en `/proveedores` que crea el `ProveedorUser` con password temporal.
6. Tests.

**Estimación**: 4-6 días.

### Fase 3 — Mejoras

- Edición de datos personales por parte del proveedor.
- Cambio de password.
- Notificaciones por email (requiere infra previa).
- Auto-registro con verificación.
- Creación de reservas desde el portal.
- Sub-permisos por usuario dentro de un proveedor (gerente vs vendedor).

---

## Decisiones a resolver antes de implementar

| # | Pregunta | Bloquea |
|---|---|---|
| 1.1 | ¿Llave de consulta: código, documento, o ambos? | Fase 1 entera |
| 1.3 | ¿Mostrar pasajeros vinculados y/o recibo PDF? | Fase 1 (alcance del endpoint) |
| 2.1 | ¿Modelo `ProveedorUser` separado o extender `User`? | Schema de Fase 2 |
| 2.3 | ¿Qué son las "aportaciones" exactamente? | Dashboard de Fase 2 |
| 2.5 | ¿Login compartido `/login` o dedicado `/proveedor/login`? | Auth flow + layout |
| 2.6 | ¿Multi-usuario por proveedor permitido? | Schema + auth + tests |

---

## Notas relacionadas

- Esto NO requiere cambios en el modelo single-tenant — la app sigue siendo de la empresa, los proveedores son entidades externas que ganan visibilidad.
- Si en el futuro se implementa el modelo de **precios y pagos** (descartado en el roadmap actual por testeos internos), las métricas del dashboard de aportaciones podrán incluir volumen monetario y comisiones reales.
- La **app móvil** que la auth dual del refactor ya soporta podría servir tanto para proveedores como para SUCURSAL_USER. Considerar al definir la API.
- Si se implementa rate limiting para el portal público, conviene aprovecharlo en `/api/v1/auth/login` para mitigar brute force ahí también.
