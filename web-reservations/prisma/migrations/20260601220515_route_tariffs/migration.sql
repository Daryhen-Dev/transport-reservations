-- Migration: tarifas en Route
--   * Cuatro columnas Decimal NOT NULL: directPriceAmount,
--     incomingAgencyPriceAmount, outgoingCommissionAmount, minPrice.
--   * Para rutas existentes (sin datos válidos todavía) se backfillea
--     con valores razonables que el seed después puede override.
--   * Una vez backfilleadas, se quita el DEFAULT para que toda nueva
--     ruta deba traer los 4 valores explícitos.

ALTER TABLE "ruta"
  ADD COLUMN "directPriceAmount"         DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "incomingAgencyPriceAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "outgoingCommissionAmount"  DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "minPrice"                  DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Backfill las rutas existentes con valores razonables del negocio
-- (precio standard $30, descuento a agencia $25, comisión $5, piso $15).
UPDATE "ruta"
SET
  "directPriceAmount"         = 30,
  "incomingAgencyPriceAmount" = 25,
  "outgoingCommissionAmount"  = 5,
  "minPrice"                  = 15
WHERE "directPriceAmount" = 0;

-- Quitar los defaults — toda nueva ruta debe especificar tarifas.
ALTER TABLE "ruta" ALTER COLUMN "directPriceAmount"         DROP DEFAULT;
ALTER TABLE "ruta" ALTER COLUMN "incomingAgencyPriceAmount" DROP DEFAULT;
ALTER TABLE "ruta" ALTER COLUMN "outgoingCommissionAmount"  DROP DEFAULT;
ALTER TABLE "ruta" ALTER COLUMN "minPrice"                  DROP DEFAULT;
