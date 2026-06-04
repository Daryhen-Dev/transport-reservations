-- Agrega email NOT NULL UNIQUE a "proveedor" para habilitar notificaciones
-- por correo a los 3 tipos (PERSONA, AGENCIA, INSTITUCION_PUBLICA).
--
-- Decision: WIPE de proveedores existentes en lugar de backfill con
-- placeholder. Esto borra en cascada todo lo que depende de un proveedor:
-- reservas de pasajeros, encomiendas, ventas externas y limpia operadores
-- de tramos. Aceptable porque la BD es de desarrollo.

-- 1. Borrar dependientes que apuntan a proveedor con FK NOT NULL
DELETE FROM "venta_externa";
DELETE FROM "reserva_encomienda";
DELETE FROM "reserva_pasajero";

-- 2. Limpiar referencias opcionales en tramos
UPDATE "ruta_tramo"
SET "operatorProveedorId" = NULL
WHERE "operatorProveedorId" IS NOT NULL;

-- 3. Borrar proveedores (ya no hay FKs apuntando)
DELETE FROM "proveedor";

-- 4. Agregar columna NOT NULL UNIQUE (tabla vacia, NOT NULL trivial)
ALTER TABLE "proveedor" ADD COLUMN "email" TEXT NOT NULL;
CREATE UNIQUE INDEX "proveedor_email_key" ON "proveedor"("email");
