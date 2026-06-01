-- CreateTable
CREATE TABLE "proveedor_tarifa" (
    "id" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "directPriceAmount" DECIMAL(10,2),
    "incomingAgencyPriceAmount" DECIMAL(10,2),
    "outgoingCommissionAmount" DECIMAL(10,2),
    "minPrice" DECIMAL(10,2),
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "proveedor_tarifa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "proveedor_tarifa_proveedorId_routeId_key" ON "proveedor_tarifa"("proveedorId", "routeId");

-- AddForeignKey
ALTER TABLE "proveedor_tarifa" ADD CONSTRAINT "proveedor_tarifa_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proveedor_tarifa" ADD CONSTRAINT "proveedor_tarifa_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "ruta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proveedor_tarifa" ADD CONSTRAINT "proveedor_tarifa_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proveedor_tarifa" ADD CONSTRAINT "proveedor_tarifa_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
