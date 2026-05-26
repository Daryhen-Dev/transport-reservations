-- CreateTable
CREATE TABLE "rol" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipo_documento" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipo_documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estado_reserva" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estado_reserva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipo_proveedor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipo_proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sucursal" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sucursal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "branchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pais" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "code" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ruta" (
    "id" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ruta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "horario_viaje" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "horario_viaje_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estado_viaje" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estado_viaje_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viaje" (
    "id" TEXT NOT NULL,
    "departureAt" TIMESTAMP(3) NOT NULL,
    "routeId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "statusId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "viaje_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manifiesto_viaje" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "receivedByBranchId" TEXT,
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manifiesto_viaje_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proveedor" (
    "id" TEXT NOT NULL,
    "proveedorTypeId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "documentTypeId" TEXT,
    "documentNumber" TEXT,
    "birthDate" TIMESTAMP(3),
    "countryId" TEXT,
    "companyName" TEXT,
    "taxId" TEXT,
    "contactName" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reserva_pasajero" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "seatCount" INTEGER NOT NULL,
    "reservationStatusId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reserva_pasajero_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pasajero_en_reserva" (
    "reservationId" TEXT NOT NULL,
    "passengerId" TEXT NOT NULL,

    CONSTRAINT "pasajero_en_reserva_pkey" PRIMARY KEY ("reservationId","passengerId")
);

-- CreateTable
CREATE TABLE "pasajero" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "documentTypeId" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "phone" TEXT,
    "countryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pasajero_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carga_categoria" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carga_categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estado_encomienda" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estado_encomienda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "destinatario" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "documentTypeId" TEXT,
    "documentNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "destinatario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reserva_encomienda" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "categoriaId" TEXT,
    "destinatarioId" TEXT,
    "description" TEXT,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "destinationBranchId" TEXT,
    "externalDestination" TEXT,
    "diameterCm" DOUBLE PRECISION,
    "widthCm" DOUBLE PRECISION,
    "heightCm" DOUBLE PRECISION,
    "lengthCm" DOUBLE PRECISION,
    "reservationStatusId" TEXT NOT NULL,
    "cargoStatusId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reserva_encomienda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tripulante" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "documentTypeId" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tripulante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rol_tripulacion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rol_tripulacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viaje_tripulante" (
    "tripId" TEXT NOT NULL,
    "crewMemberId" TEXT NOT NULL,
    "crewRoleId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "viaje_tripulante_pkey" PRIMARY KEY ("tripId","crewMemberId")
);

-- CreateTable
CREATE TABLE "refresh_token" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rol_name_key" ON "rol"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tipo_documento_name_key" ON "tipo_documento"("name");

-- CreateIndex
CREATE UNIQUE INDEX "estado_reserva_name_key" ON "estado_reserva"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tipo_proveedor_name_key" ON "tipo_proveedor"("name");

-- CreateIndex
CREATE UNIQUE INDEX "sucursal_slug_key" ON "sucursal"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "pais_name_key" ON "pais"("name");

-- CreateIndex
CREATE UNIQUE INDEX "pais_code_key" ON "pais"("code");

-- CreateIndex
CREATE UNIQUE INDEX "horario_viaje_routeId_time_key" ON "horario_viaje"("routeId", "time");

-- CreateIndex
CREATE UNIQUE INDEX "estado_viaje_name_key" ON "estado_viaje"("name");

-- CreateIndex
CREATE UNIQUE INDEX "manifiesto_viaje_code_key" ON "manifiesto_viaje"("code");

-- CreateIndex
CREATE UNIQUE INDEX "manifiesto_viaje_tripId_key" ON "manifiesto_viaje"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "pasajero_documentTypeId_documentNumber_key" ON "pasajero"("documentTypeId", "documentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "carga_categoria_name_key" ON "carga_categoria"("name");

-- CreateIndex
CREATE UNIQUE INDEX "estado_encomienda_name_key" ON "estado_encomienda"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tripulante_documentTypeId_documentNumber_key" ON "tripulante"("documentTypeId", "documentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "rol_tripulacion_name_key" ON "rol_tripulacion"("name");

-- CreateIndex
CREATE UNIQUE INDEX "viaje_tripulante_tripId_crewRoleId_key" ON "viaje_tripulante"("tripId", "crewRoleId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_token_tokenHash_key" ON "refresh_token"("tokenHash");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "rol"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "sucursal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ruta" ADD CONSTRAINT "ruta_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horario_viaje" ADD CONSTRAINT "horario_viaje_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "ruta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viaje" ADD CONSTRAINT "viaje_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "ruta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viaje" ADD CONSTRAINT "viaje_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viaje" ADD CONSTRAINT "viaje_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "horario_viaje"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viaje" ADD CONSTRAINT "viaje_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "estado_viaje"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manifiesto_viaje" ADD CONSTRAINT "manifiesto_viaje_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "viaje"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manifiesto_viaje" ADD CONSTRAINT "manifiesto_viaje_receivedByBranchId_fkey" FOREIGN KEY ("receivedByBranchId") REFERENCES "sucursal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proveedor" ADD CONSTRAINT "proveedor_proveedorTypeId_fkey" FOREIGN KEY ("proveedorTypeId") REFERENCES "tipo_proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proveedor" ADD CONSTRAINT "proveedor_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "tipo_documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proveedor" ADD CONSTRAINT "proveedor_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "pais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva_pasajero" ADD CONSTRAINT "reserva_pasajero_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "viaje"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva_pasajero" ADD CONSTRAINT "reserva_pasajero_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva_pasajero" ADD CONSTRAINT "reserva_pasajero_reservationStatusId_fkey" FOREIGN KEY ("reservationStatusId") REFERENCES "estado_reserva"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pasajero_en_reserva" ADD CONSTRAINT "pasajero_en_reserva_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reserva_pasajero"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pasajero_en_reserva" ADD CONSTRAINT "pasajero_en_reserva_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "pasajero"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pasajero" ADD CONSTRAINT "pasajero_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "tipo_documento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pasajero" ADD CONSTRAINT "pasajero_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "pais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "destinatario" ADD CONSTRAINT "destinatario_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "tipo_documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva_encomienda" ADD CONSTRAINT "reserva_encomienda_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "viaje"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva_encomienda" ADD CONSTRAINT "reserva_encomienda_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva_encomienda" ADD CONSTRAINT "reserva_encomienda_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "carga_categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva_encomienda" ADD CONSTRAINT "reserva_encomienda_destinatarioId_fkey" FOREIGN KEY ("destinatarioId") REFERENCES "destinatario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva_encomienda" ADD CONSTRAINT "reserva_encomienda_destinationBranchId_fkey" FOREIGN KEY ("destinationBranchId") REFERENCES "sucursal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva_encomienda" ADD CONSTRAINT "reserva_encomienda_reservationStatusId_fkey" FOREIGN KEY ("reservationStatusId") REFERENCES "estado_reserva"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva_encomienda" ADD CONSTRAINT "reserva_encomienda_cargoStatusId_fkey" FOREIGN KEY ("cargoStatusId") REFERENCES "estado_encomienda"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tripulante" ADD CONSTRAINT "tripulante_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "tipo_documento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viaje_tripulante" ADD CONSTRAINT "viaje_tripulante_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "viaje"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viaje_tripulante" ADD CONSTRAINT "viaje_tripulante_crewMemberId_fkey" FOREIGN KEY ("crewMemberId") REFERENCES "tripulante"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viaje_tripulante" ADD CONSTRAINT "viaje_tripulante_crewRoleId_fkey" FOREIGN KEY ("crewRoleId") REFERENCES "rol_tripulacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
