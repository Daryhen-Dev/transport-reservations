-- CreateTable
CREATE TABLE "ruta_tramo" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "isExternal" BOOLEAN NOT NULL DEFAULT false,
    "operatorProveedorId" TEXT,
    "externalCostAmount" DECIMAL(10,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "ruta_tramo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ruta_tramo_routeId_position_key" ON "ruta_tramo"("routeId", "position");

-- AddForeignKey
ALTER TABLE "ruta_tramo" ADD CONSTRAINT "ruta_tramo_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "ruta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ruta_tramo" ADD CONSTRAINT "ruta_tramo_operatorProveedorId_fkey" FOREIGN KEY ("operatorProveedorId") REFERENCES "proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ruta_tramo" ADD CONSTRAINT "ruta_tramo_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ruta_tramo" ADD CONSTRAINT "ruta_tramo_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
