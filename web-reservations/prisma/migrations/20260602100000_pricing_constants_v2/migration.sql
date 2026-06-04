-- Reemplaza el modelo de tarifas por-ruta + overrides por proveedor por
-- tarifas globales fijas + un enum PriceType en la reserva. Los valores
-- ($30/$30/$20-30) viven en lib/pricing.ts.
--
-- Cambios:
--   - DROP tabla "proveedor_tarifa" (overrides por proveedor — ya no aplica).
--   - DROP 4 columnas de tarifa en "ruta".
--   - DROP suggestedAmount y referredByAgencyId en "reserva_pasajero"
--     (el referidor ahora es el proveedor mismo cuando es AGENCIA).
--   - ADD enum PriceType + columna priceType en "reserva_pasajero".
--   - Backfill: reservas con referredByAgencyId → REFERIDOS; resto → NORMAL.

-- 1. Drop tabla de overrides por proveedor
DROP TABLE IF EXISTS "proveedor_tarifa";

-- 2. Drop FK + columna referredByAgencyId
ALTER TABLE "reserva_pasajero"
  DROP CONSTRAINT IF EXISTS "reserva_pasajero_referredByAgencyId_fkey";

-- 3. Crear enum PriceType
CREATE TYPE "PriceType" AS ENUM ('NORMAL', 'REFERIDOS', 'LIBRE');

-- 4. Agregar priceType (nullable temporalmente para backfill)
ALTER TABLE "reserva_pasajero"
  ADD COLUMN "priceType" "PriceType";

-- 5. Backfill: referidos si tenia referredByAgencyId, normal si no
UPDATE "reserva_pasajero"
SET "priceType" = 'REFERIDOS'
WHERE "referredByAgencyId" IS NOT NULL;

UPDATE "reserva_pasajero"
SET "priceType" = 'NORMAL'
WHERE "priceType" IS NULL;

-- 6. NOT NULL
ALTER TABLE "reserva_pasajero"
  ALTER COLUMN "priceType" SET NOT NULL;

-- 7. Drop columnas deprecadas de reserva
ALTER TABLE "reserva_pasajero"
  DROP COLUMN "suggestedAmount",
  DROP COLUMN "referredByAgencyId";

-- 8. Drop columnas de tarifa de ruta
ALTER TABLE "ruta"
  DROP COLUMN "directPriceAmount",
  DROP COLUMN "incomingAgencyPriceAmount",
  DROP COLUMN "outgoingCommissionAmount",
  DROP COLUMN "minPrice";
