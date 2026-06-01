-- Reemplaza el modelo de "canal de venta" (salesChannel + externalAgencyId)
-- por un modelo derivado del tipo de proveedor del comprador + dos columnas
-- opcionales para registrar referidos con comisión.
--
-- Cambios:
--   - DROP salesChannel (enum SalesChannel)
--   - DROP externalAgencyId (FK a proveedor)
--   - ADD referredByAgencyId (FK opcional a proveedor)
--   - ADD commissionAmount (DECIMAL(10,2) opcional)

ALTER TABLE "reserva_pasajero"
  DROP CONSTRAINT IF EXISTS "reserva_pasajero_externalAgencyId_fkey";

ALTER TABLE "reserva_pasajero"
  DROP COLUMN IF EXISTS "externalAgencyId",
  DROP COLUMN IF EXISTS "salesChannel";

DROP TYPE IF EXISTS "SalesChannel";

ALTER TABLE "reserva_pasajero"
  ADD COLUMN "referredByAgencyId" TEXT,
  ADD COLUMN "commissionAmount" DECIMAL(10, 2);

ALTER TABLE "reserva_pasajero"
  ADD CONSTRAINT "reserva_pasajero_referredByAgencyId_fkey"
  FOREIGN KEY ("referredByAgencyId") REFERENCES "proveedor"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
