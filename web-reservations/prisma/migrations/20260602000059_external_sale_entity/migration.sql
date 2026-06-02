-- CreateTable
CREATE TABLE "venta_externa" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "operatorAgencyId" TEXT NOT NULL,
    "buyerName" TEXT,
    "buyerDocument" TEXT,
    "buyerPhone" TEXT,
    "departureAt" TIMESTAMP(3) NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "passengerCount" INTEGER NOT NULL DEFAULT 1,
    "priceCharged" DECIMAL(10,2) NOT NULL,
    "costPaidToOperator" DECIMAL(10,2) NOT NULL,
    "reservationStatusId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "venta_externa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "venta_externa_branchId_departureAt_idx" ON "venta_externa"("branchId", "departureAt");

-- CreateIndex
CREATE INDEX "venta_externa_operatorAgencyId_idx" ON "venta_externa"("operatorAgencyId");

-- AddForeignKey
ALTER TABLE "venta_externa" ADD CONSTRAINT "venta_externa_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_externa" ADD CONSTRAINT "venta_externa_operatorAgencyId_fkey" FOREIGN KEY ("operatorAgencyId") REFERENCES "proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_externa" ADD CONSTRAINT "venta_externa_reservationStatusId_fkey" FOREIGN KEY ("reservationStatusId") REFERENCES "estado_reserva"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_externa" ADD CONSTRAINT "venta_externa_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_externa" ADD CONSTRAINT "venta_externa_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
