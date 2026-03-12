-- 1. Rename Cliente table back to Passenger
ALTER TABLE "Cliente" RENAME TO "Passenger";

-- 2. Rename CustomerType table to ProveedorType
ALTER TABLE "CustomerType" RENAME TO "ProveedorType";

-- 3. Rename customerId → proveedorId on PassengerReservation
ALTER TABLE "PassengerReservation" RENAME COLUMN "customerId" TO "proveedorId";

-- 4. Rename customerId → proveedorId on CargoReservation
ALTER TABLE "CargoReservation" RENAME COLUMN "customerId" TO "proveedorId";

-- 5. Rename customerTypeId → proveedorTypeId on Proveedor
ALTER TABLE "Proveedor" RENAME COLUMN "customerTypeId" TO "proveedorTypeId";
