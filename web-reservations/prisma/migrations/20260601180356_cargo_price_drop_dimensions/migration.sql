-- Migration: cargo encomiendas
--   * Drop dimension columns (diameter/width/height/length) — never used.
--   * Add priceAmount (Decimal 10,2) — every encomienda needs a price.
--   * Add cobrarEnDestino (Boolean default false) — flag for COD payments.
--   * Backfill categoriaId NULL → "OTROS" and make NOT NULL.
--
-- Existing rows are migrated in place:
--   * categoriaId NULL → "OTROS" lookup.
--   * priceAmount: added with DEFAULT 0 to satisfy NOT NULL on existing rows;
--     the DEFAULT is then dropped so future inserts must supply it.

-- 1) Backfill categoriaId NULL → carga_categoria(name='OTROS')
UPDATE "reserva_encomienda"
SET "categoriaId" = (SELECT "id" FROM "carga_categoria" WHERE "name" = 'OTROS' LIMIT 1)
WHERE "categoriaId" IS NULL;

-- 2) Drop existing FK so we can ALTER NOT NULL safely
ALTER TABLE "reserva_encomienda" DROP CONSTRAINT "reserva_encomienda_categoriaId_fkey";

-- 3) Schema changes: drop dimension columns, add price/cod, make categoriaId NOT NULL
ALTER TABLE "reserva_encomienda"
  DROP COLUMN "diameterCm",
  DROP COLUMN "heightCm",
  DROP COLUMN "lengthCm",
  DROP COLUMN "widthCm",
  ADD COLUMN "cobrarEnDestino" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "priceAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ALTER COLUMN "categoriaId" SET NOT NULL;

-- 4) Drop the temporary DEFAULT on priceAmount — future inserts MUST provide it
ALTER TABLE "reserva_encomienda" ALTER COLUMN "priceAmount" DROP DEFAULT;

-- 5) Re-add FK to carga_categoria
ALTER TABLE "reserva_encomienda" ADD CONSTRAINT "reserva_encomienda_categoriaId_fkey"
  FOREIGN KEY ("categoriaId") REFERENCES "carga_categoria"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
