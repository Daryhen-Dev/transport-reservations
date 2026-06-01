# Rutas multi-tramo, tarifas y precios por proveedor — Planificación

> **Estado**: planificado, no implementado. Decisiones clave ya tomadas, hay puntos abiertos para revisión antes de codificar.
> **Última actualización**: 2026-06-01
> **Owner**: Daryhen

## Resumen ejecutivo

El negocio NO es solo "operar viajes entre sucursales propias". Cubrimos rutas que combinan tramos propios + tramos operados por agencias externas (que en nuestro modelo son proveedores con tipo AGENCIA). Además vendemos a 3 precios distintos según el canal y manejamos tarifas negociadas con cada proveedor.

Concretamente, este documento cubre:

1. **Multi-tramo (itinerario)** — vender un viaje "San Cristóbal → Isabela" cuando Isabela no es sucursal nuestra: el trayecto es SC → SZ (propio) + SZ → Isabela (operado por una agencia que es proveedor nuestro).
2. **Reformulación de tipos de proveedor** — antes PERSONA/EMPRESA; ahora 4 tipos planos: PERSONA, EMPRESA, AGENCIA, INSTITUCION_PUBLICA.
3. **Tarifa standard por ruta** con 3 valores: directo / desde-agencia / comisión-a-agencia.
4. **Tarifa negociada por proveedor + ruta** (override) — opcionalmente editable en cada reserva.
5. **Precio piso absoluto por ruta** — ningún operador puede vender por debajo de ese monto.

## Decisiones ya tomadas

| Decisión | Valor elegido |
|---|---|
| **Modelado de multi-tramo** | Opción A — Itinerary explícito con legs ordenados |
| **Categorización de proveedores** | 4 tipos planos: PERSONA / EMPRESA / AGENCIA / INSTITUCION_PUBLICA |
| **Tarifa por proveedor** | Combinación: tabla `ProveedorTariff` (proveedor + ruta → precio) como default sugerido, editable en cada reserva |
| **Precio mínimo** | Piso absoluto por ruta (`Route.minPrice`). Operador no puede bajar de ahí |
| **Alcance** | Solo pasajeros en esta fase. Encomiendas siguen con su `priceAmount` actual |
| **Comisión a agencias externas** | Por leg del itinerario (configurable, no fijo $5 global) |

## Modelo de datos propuesto

### 1. `ProveedorType` (lookup table existente — ampliamos)

Hoy: `PERSONA`, `EMPRESA`.
Nuevo: agregar `AGENCIA`, `INSTITUCION_PUBLICA` al seed.

Sin cambios de schema (es solo seed data). Los proveedores existentes con tipo PERSONA o EMPRESA quedan iguales; los nuevos pueden tener cualquiera de los 4.

### 2. `Route` — agregar tarifas y piso

```prisma
model Route {
  // ... campos existentes ...

  // Tarifa standard de venta DIRECTA al pasajero final (sin proveedor)
  directPriceAmount         Decimal  @db.Decimal(10, 2)

  // Tarifa cuando recibimos pasajero de una agencia externa (les damos descuento)
  incomingAgencyPriceAmount Decimal  @db.Decimal(10, 2)

  // Comisión que cobramos cuando enviamos un pasajero a OTRA agencia para que opere un tramo
  outgoingCommissionAmount  Decimal  @db.Decimal(10, 2)

  // Piso absoluto — ninguna reserva sobre esta ruta puede tener precio < minPrice
  minPrice                  Decimal  @db.Decimal(10, 2)
}
```

Estos valores se definen al crear/editar la ruta (formulario en `/rutas`).

### 3. `ProveedorTariff` — tarifa negociada (override)

Nuevo modelo:

```prisma
model ProveedorTariff {
  id           String   @id @default(cuid())
  proveedorId  String
  proveedor    Proveedor @relation(fields: [proveedorId], references: [id])
  routeId      String
  route        Route    @relation(fields: [routeId], references: [id])
  amount       Decimal  @db.Decimal(10, 2)
  notes        String?  // ej: "Acuerdo Feb 2026"
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([proveedorId, routeId])
}
```

Al crear una reserva con un proveedor, el sistema busca tarifa override y la sugiere. Si no existe, sugiere la `Route.directPriceAmount` o `incomingAgencyPriceAmount` según el canal.

### 4. `Itinerary` — viaje multi-tramo

```prisma
model Itinerary {
  id              String    @id @default(cuid())
  name            String    // ej: "San Cristóbal → Isabela"
  originLabel     String    // ej: "San Cristóbal"
  finalLabel      String    // ej: "Isabela"
  legs            ItineraryLeg[]
  reservations    PassengerReservation[]
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model ItineraryLeg {
  id              String     @id @default(cuid())
  itineraryId     String
  itinerary       Itinerary  @relation(fields: [itineraryId], references: [id], onDelete: Cascade)
  order           Int        // 1, 2, 3 ...

  // Si es leg propio: route apunta a nuestra Route
  routeId         String?
  route           Route?     @relation(fields: [routeId], references: [id])

  // Si es leg externo: lo opera un proveedor de tipo AGENCIA
  externalAgencyId    String?
  externalAgency      Proveedor? @relation("ExternalAgencyLegs", fields: [externalAgencyId], references: [id])
  externalOrigin      String?   // "Santa Cruz"
  externalDestination String?   // "Isabela"

  // Monto que aplica a este leg
  amount          Decimal    @db.Decimal(10, 2)

  @@unique([itineraryId, order])
}
```

Reglas:
- Cada leg tiene EITHER `routeId` (leg propio) OR `externalAgencyId + externalOrigin + externalDestination` (leg externo). Nunca ambos.
- El `amount` de un leg propio es lo que cobramos al pasajero por ese tramo.
- El `amount` de un leg externo es nuestra comisión por derivar (lo que la agencia externa cobre va por separado y no es nuestro registro).

Ejemplo concreto "SC → Isabela" creado por OWNER:

```
Itinerary { name: "SC → Isabela", originLabel: "San Cristóbal", finalLabel: "Isabela" }
  Leg 1: order=1, route=SC→SZ,    amount=30.00
  Leg 2: order=2, externalAgency=Agencia X, externalOrigin="SZ", externalDestination="Isabela", amount=5.00
```

### 5. `PassengerReservation` — agregar canal + precio

```prisma
model PassengerReservation {
  // ... campos existentes ...

  // Canal de venta
  salesChannel        SalesChannel @default(DIRECT)
  // Si salesChannel != DIRECT, agencia involucrada (siempre un Proveedor con tipo AGENCIA)
  externalAgencyId    String?
  externalAgency      Proveedor?   @relation("ReservationAgency", fields: [externalAgencyId], references: [id])

  // Itinerary opcional — si el pasajero va a un destino externo (NULL = viaje directo sobre la route del trip)
  itineraryId         String?
  itinerary           Itinerary?   @relation(fields: [itineraryId], references: [id])

  // Precio total de la reserva (precio negociado, ya ajustado por el operador si hubo override)
  priceAmount         Decimal      @db.Decimal(10, 2)

  // Snapshot del precio que el sistema sugirió originalmente (para auditoría)
  suggestedAmount     Decimal      @db.Decimal(10, 2)
}

enum SalesChannel {
  DIRECT          // Venta directa al pasajero (sin proveedor)
  FROM_AGENCY     // Una agencia externa nos envía el pasajero
  TO_AGENCY       // Nosotros enviamos el pasajero a otra agencia
}
```

Nota: ya existe `Proveedor` asociado a la reserva (el comprador). Lo nuevo es `externalAgencyId` que es **distinto** del proveedor comprador — esta es la agencia con la que coordinamos el tramo externo o desde la cual nos viene el pasajero. En muchos casos serán el mismo `Proveedor` (cuando el comprador-empresa ES la agencia colaboradora), pero conceptualmente son cosas distintas.

## Flujos operativos

### Caso 1 — Venta directa al pasajero, ruta propia (DIRECT)

```
Pasajero llega a la sucursal de San Cristóbal y pide "SC → SZ".
  Itinerary: null (viaje directo, no requiere itinerario explícito)
  Trip: SC → SZ del día X
  Proveedor: PERSONA → Juan Pérez
  salesChannel: DIRECT
  externalAgencyId: null
  Precio sugerido: Route.directPriceAmount = $30
  Precio cobrado: $30 (no editado)
```

### Caso 2 — Pasajero viene de una agencia, ruta propia (FROM_AGENCY)

```
La agencia "Tours SA" nos envía un pasajero para el viaje SC → SZ.
  Itinerary: null
  Trip: SC → SZ del día X
  Proveedor: EMPRESA o AGENCIA → Tours SA  (es el comprador)
  salesChannel: FROM_AGENCY
  externalAgencyId: Tours SA  (o null si el Proveedor comprador ya es la agencia)
  Precio sugerido: ProveedorTariff override (si hay) o Route.incomingAgencyPriceAmount = $25
  Precio cobrado: $25 (no editado)
```

### Caso 3 — Pasajero compra "SC → Isabela", ruta multi-tramo (TO_AGENCY en leg externo)

```
Pasajero compra "SC → Isabela" en nuestra sucursal de SC.
  Itinerary: "SC → Isabela" (con 2 legs)
    Leg 1: SC → SZ, amount=$30
    Leg 2: SZ → Isabela (vía Agencia X), amount=$5
  Trip: SC → SZ del día X (la reserva va contra nuestro leg propio)
  Proveedor: PERSONA → Juan Pérez
  salesChannel: DIRECT (el pasajero compra directo con nosotros)
  externalAgencyId: Agencia X (para el leg de Isabela)
  Precio sugerido: $30 + $5 = $35 (suma de legs)
  Precio cobrado: $35
```

Cuando el viaje cierra y se emite el manifiesto, el destino final figura como "Isabela" para este pasajero. Internamente solo viaja con nosotros hasta SZ, ahí transfiere a Agencia X.

### Override y mínimo

En cualquier caso, el operador puede ajustar el precio en el form:
- Si baja por debajo de `Route.minPrice` → error: "Precio mínimo permitido en esta ruta: $X".
- Si tiene `ProveedorTariff` activa, el sugerido sale de ahí. Si no, sale de las tarifas de Route.

## Impacto en UI/UX

| Pantalla | Cambio |
|---|---|
| `/rutas/[id]` (edit) | Nuevos campos: directPriceAmount, incomingAgencyPriceAmount, outgoingCommissionAmount, minPrice |
| `/proveedores` lista | Filtro por tipo (incluyendo AGENCIA y INSTITUCION_PUBLICA) + columna tipo visible |
| `/proveedores/[id]` (NUEVA) | Pestaña "Tarifas negociadas" con CRUD de ProveedorTariff por ruta |
| `/itinerarios` (NUEVA, OWNER-only) | CRUD de itinerarios con sus legs (drag-and-drop para ordenar) |
| `/reservas` (nueva reserva, sheet) | Nuevo selector: "Tipo de viaje: Directo / Multi-tramo (itinerario)" + "Canal: Directo / Viene de agencia / Va a agencia" + el precio sugerido aparece automáticamente + override editable |
| Recibo PDF | Si hay itinerario, mostrar los legs con destino final destacado |
| Manifiesto PDF | Mostrar "destino final" cuando aplique (Isabela) en lugar de solo "destination de la route" |
| Dashboard | Cards nuevas: ingreso por canal (DIRECT/FROM/TO), comisiones cobradas a agencias externas |
| CSV export (reservas pasajeros) | Columnas: Canal, Agencia externa, Itinerario, Precio sugerido, Precio cobrado |

## Plan de implementación por fases

### Fase 1 — Reformulación de tipos de proveedor

1. Update del seed: agregar `AGENCIA` e `INSTITUCION_PUBLICA` al `ProveedorType`.
2. UI de `/proveedores`: filtro por tipo + badge visual.
3. Form de nuevo proveedor: dropdown con los 4 tipos.

**Estimación**: ~half day.

### Fase 2 — Tarifas standard en `Route`

1. Migration: agregar `directPriceAmount`, `incomingAgencyPriceAmount`, `outgoingCommissionAmount`, `minPrice` a `Route` (todas Decimal NOT NULL DEFAULT 0 inicialmente para no romper).
2. Backfill seed: las 2 rutas existentes (SC↔SZ) reciben valores default: direct=$30, incomingAgency=$25, outgoingCommission=$5, minPrice=$15.
3. Form de edit de ruta agrega los 4 inputs.
4. Endpoint de Route actualiza para aceptar los 4 valores.

**Estimación**: 1 día.

### Fase 3 — Precio + canal en `PassengerReservation`

1. Migration: agregar `priceAmount`, `suggestedAmount`, `salesChannel`, `externalAgencyId`, `itineraryId` a `PassengerReservation`.
2. Schema Zod actualizado, endpoint POST/PATCH actualizado.
3. Form de reserva: dropdown de canal + selector de agencia externa + precio sugerido + precio editable + check de mínimo.
4. Validación server: amount >= Route.minPrice.
5. Recibo PDF muestra el precio cobrado y el canal.
6. CSV export agrega las columnas.

**Estimación**: 2 días.

### Fase 4 — `ProveedorTariff` (override por proveedor + ruta)

1. Migration + modelo.
2. Página `/proveedores/[id]/tarifas` (CRUD).
3. Lookup automática al crear reserva: si hay tarifa override, sugiere esa.
4. Endpoint con auth (OWNER-only para crear/editar tarifas).

**Estimación**: 1.5 días.

### Fase 5 — `Itinerary` + multi-tramo

1. Migration: nuevos modelos Itinerary, ItineraryLeg, enum SalesChannel.
2. Página `/itinerarios` con CRUD (OWNER-only). Drag-and-drop para ordenar legs.
3. Form de reserva: toggle "Multi-tramo" → muestra dropdown de itinerarios disponibles. Auto-calcula el precio sumando los amounts de los legs.
4. Manifiesto + recibo muestran destino final si hay itinerario.
5. Dashboard agrega métrica de comisiones.

**Estimación**: 3-4 días (el grueso del proyecto).

### Fase 6 — Reportería y exports avanzados

1. Reportes por canal de venta (cuánto vendimos directo vs vía agencia).
2. Reporte de comisiones cobradas a agencias externas.
3. Exportación con todas las columnas nuevas.

**Estimación**: 1 día.

**Total estimado**: 9-11 días.

## Decisiones aún pendientes (resolver antes de Fase 5)

| # | Pregunta | Bloquea |
|---|---|---|
| 1 | ¿Un mismo Itinerary puede tener varios "tipos" de legs? Ej: leg 1 propio, leg 2 externo, leg 3 propio (algún día). ¿O siempre el patrón "propio → externo" terminal? | Schema y validación de ItineraryLeg |
| 2 | El `externalAgencyId` en una reserva DIRECT/TO_AGENCY a veces apunta a una agencia DISTINTA del proveedor comprador. ¿Acepta tener AMBOS (proveedor comprador + agencia destino)? | Form de reserva |
| 3 | ¿La comisión a la agencia externa es siempre el mismo valor o varía por ruta? Hoy lo modelamos como `amount` en `ItineraryLeg` (por leg) — significa que cada itinerario tiene su comisión. | Tarifa de leg externo |
| 4 | ¿Necesitamos guardar un "Proveedor pagado / Proveedor pendiente de cobrar" para los tramos externos? (Cuándo le pagamos a la Agencia X por los pasajeros que nos envió o nos cobra por los que enviamos?) | Modelo financiero — fuera de scope ahora |
| 5 | El `Trip` de la reserva ¿siempre es el trip de LEG 1 propio (el que físicamente sale de nuestra sucursal)? ¿O puede haber casos donde la reserva no tiene Trip propio? | Validación de reserva con itinerario |

## Lo que NO entra en este plan (out of scope)

- Modelo de pagos / cobranzas / facturación electrónica.
- Comisiones automáticas / liquidación con agencias externas.
- Precios por encomienda según canal (fase futura, opcional).
- Itinerarios con 3+ tramos propios encadenados (hoy asumimos máx 1 leg externo terminal).
- Tarifas en múltiples monedas.

## Notas relacionadas

- Este plan es ortogonal al "Portal del proveedor" (otro doc de planificación). Cuando ese portal se implemente, las agencias y otros proveedores podrán ver sus reservas y tarifas negociadas allí.
- El audit `createdBy`/`updatedBy` que ya existe en `Route` cubre quién modificó las tarifas.
- Los precios negociados en `ProveedorTariff` también deberían tener audit (`createdBy`) — heredamos el patrón existente.
- Tras implementar Fase 3, el dashboard ya puede mostrar ingreso real por canal, lo cual es valioso aunque las demás fases no estén.
