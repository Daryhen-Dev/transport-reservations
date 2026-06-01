-- Migrate all proveedores currently typed as EMPRESA to AGENCIA, then
-- remove the EMPRESA row from the proveedor_type catalog.
--
-- Idempotent: if EMPRESA is already gone, the UPDATE/DELETE simply match
-- zero rows.

UPDATE "proveedor"
SET "proveedorTypeId" = (
  SELECT "id" FROM "tipo_proveedor" WHERE "name" = 'AGENCIA'
)
WHERE "proveedorTypeId" = (
  SELECT "id" FROM "tipo_proveedor" WHERE "name" = 'EMPRESA'
);

DELETE FROM "tipo_proveedor" WHERE "name" = 'EMPRESA';
