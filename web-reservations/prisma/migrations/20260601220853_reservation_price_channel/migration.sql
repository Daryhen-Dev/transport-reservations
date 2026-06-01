-- Migration: precio + canal en PassengerReservation
--   * Nuevo enum SalesChannel (DIRECT/FROM_AGENCY/TO_AGENCY).
--   * Nuevas columnas: priceAmount, suggestedAmount, salesChannel,
--     externalAgencyId (FK a proveedor, opcional).
--   * Para filas existentes se backfillea con priceAmount=0,
--     suggestedAmount=0 y salesChannel=DIRECT. Después se quita
--     el DEFAULT de las Decimal para que toda nueva reserva
--     traiga los montos explícitos.

CREATE TYPE "SalesChannel" AS ENUM ('DIRECT', 'FROM_AGENCY', 'TO_AGENCY');

ALTER TABLE "reserva_pasajero"
  ADD COLUMN "externalAgencyId" TEXT,
  ADD COLUMN "priceAmount"      DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "suggestedAmount"  DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "salesChannel"     "SalesChannel" NOT NULL DEFAULT 'DIRECT';

-- Quitar defaults Decimal — toda nueva reserva debe traer su precio.
ALTER TABLE "reserva_pasajero" ALTER COLUMN "priceAmount"     DROP DEFAULT;
ALTER TABLE "reserva_pasajero" ALTER COLUMN "suggestedAmount" DROP DEFAULT;

-- FK a proveedor (puede ser null cuando salesChannel=DIRECT sin tramo externo)
ALTER TABLE "reserva_pasajero"
  ADD CONSTRAINT "reserva_pasajero_externalAgencyId_fkey"
  FOREIGN KEY ("externalAgencyId") REFERENCES "proveedor"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
