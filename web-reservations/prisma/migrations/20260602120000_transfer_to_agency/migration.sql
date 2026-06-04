-- Habilita transferir reservas a otra agencia cuando no realizamos el viaje
-- por pocos pasajeros. Cobramos $5/pax fijos de comision (lib/pricing.ts) y
-- el resto va a la agencia.
--
-- Cambios:
--   - DROP tabla "venta_externa" (modelo ExternalSale nunca se uso).
--   - INSERT TRANSFERIDA en "estado_reserva".
--   - ADD a "reserva_pasajero": transferredToAgencyId (FK a proveedor),
--     transferAmountToAgency y transferCommissionAmount (snapshots).

-- 1. Drop tabla ExternalSale (no esta en uso)
DROP TABLE IF EXISTS "venta_externa";

-- 2. Insertar estado TRANSFERIDA (cuid generado en runtime imitando el patron)
INSERT INTO "estado_reserva" ("id", "name", "createdAt", "updatedAt")
VALUES (
  'cltransferida' || substr(md5(random()::text), 1, 12),
  'TRANSFERIDA',
  NOW(),
  NOW()
)
ON CONFLICT ("name") DO NOTHING;

-- 3. Agregar campos de transferencia en reserva_pasajero
ALTER TABLE "reserva_pasajero"
  ADD COLUMN "transferredToAgencyId"    TEXT,
  ADD COLUMN "transferAmountToAgency"   DECIMAL(10, 2),
  ADD COLUMN "transferCommissionAmount" DECIMAL(10, 2);

-- 4. FK a proveedor (nullable, ON DELETE SET NULL para no perder historia)
ALTER TABLE "reserva_pasajero"
  ADD CONSTRAINT "reserva_pasajero_transferredToAgencyId_fkey"
  FOREIGN KEY ("transferredToAgencyId") REFERENCES "proveedor"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
