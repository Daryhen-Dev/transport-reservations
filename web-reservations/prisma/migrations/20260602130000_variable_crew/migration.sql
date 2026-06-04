-- Tripulacion variable por viaje: CAPITAN obligatorio (max 1) + TRIPULANTE
-- opcional (0 a 2). Antes era CAPITAN + PRIMER_OFICIAL + MAQUINISTA, todos
-- unicos por viaje. Ahora se permiten multiples TRIPULANTE en un mismo
-- viaje, asi que cae el unique constraint.
--
-- Cambios:
--   - DROP UNIQUE (tripId, crewRoleId) en viaje_tripulante.
--   - INSERT rol TRIPULANTE.
--   - UPDATE viaje_tripulante: asignaciones de PRIMER_OFICIAL y MAQUINISTA
--     se migran a TRIPULANTE (el orden visual se pierde, los miembros
--     siguen asignados).
--   - DELETE roles PRIMER_OFICIAL y MAQUINISTA.

-- 1. Drop unique constraint sobre (tripId, crewRoleId)
DROP INDEX IF EXISTS "viaje_tripulante_tripId_crewRoleId_key";

-- 2. Insertar rol TRIPULANTE (idempotente)
INSERT INTO "rol_tripulacion" ("id", "name", "createdAt", "updatedAt")
VALUES (
  'cltripulante' || substr(md5(random()::text), 1, 12),
  'TRIPULANTE',
  NOW(),
  NOW()
)
ON CONFLICT ("name") DO NOTHING;

-- 3. Migrar asignaciones de PRIMER_OFICIAL y MAQUINISTA a TRIPULANTE
UPDATE "viaje_tripulante"
SET "crewRoleId" = (SELECT "id" FROM "rol_tripulacion" WHERE "name" = 'TRIPULANTE')
WHERE "crewRoleId" IN (
  SELECT "id" FROM "rol_tripulacion" WHERE "name" IN ('PRIMER_OFICIAL', 'MAQUINISTA')
);

-- 4. Borrar roles legacy
DELETE FROM "rol_tripulacion" WHERE "name" IN ('PRIMER_OFICIAL', 'MAQUINISTA');
