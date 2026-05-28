-- AlterTable
ALTER TABLE "horario_viaje" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "updatedById" TEXT;

-- AlterTable
ALTER TABLE "manifiesto_viaje" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "reserva_encomienda" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "updatedById" TEXT;

-- AlterTable
ALTER TABLE "reserva_pasajero" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "updatedById" TEXT;

-- AlterTable
ALTER TABLE "ruta" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "updatedById" TEXT;

-- AlterTable
ALTER TABLE "sucursal" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "updatedById" TEXT;

-- AlterTable
ALTER TABLE "usuario" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "viaje" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "updatedById" TEXT;

-- AddForeignKey
ALTER TABLE "sucursal" ADD CONSTRAINT "sucursal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sucursal" ADD CONSTRAINT "sucursal_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ruta" ADD CONSTRAINT "ruta_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ruta" ADD CONSTRAINT "ruta_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horario_viaje" ADD CONSTRAINT "horario_viaje_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horario_viaje" ADD CONSTRAINT "horario_viaje_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viaje" ADD CONSTRAINT "viaje_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viaje" ADD CONSTRAINT "viaje_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manifiesto_viaje" ADD CONSTRAINT "manifiesto_viaje_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva_pasajero" ADD CONSTRAINT "reserva_pasajero_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva_pasajero" ADD CONSTRAINT "reserva_pasajero_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva_encomienda" ADD CONSTRAINT "reserva_encomienda_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva_encomienda" ADD CONSTRAINT "reserva_encomienda_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
