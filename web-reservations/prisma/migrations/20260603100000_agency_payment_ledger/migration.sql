-- Libro mayor de pagos a agencias. Cada AgencyPayment representa un
-- evento de liquidacion (parcial o total) hacia una agencia. El saldo
-- se calcula al vuelo: sum(cargos de reservas) - sum(pagos).

CREATE TABLE "agencia_pago" (
    "id"          TEXT NOT NULL,
    "agencyId"    TEXT NOT NULL,
    "amount"      DECIMAL(10, 2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "notes"       TEXT,
    "branchId"    TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "agencia_pago_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "agencia_pago_agencyId_paymentDate_idx"
    ON "agencia_pago" ("agencyId", "paymentDate");

CREATE INDEX "agencia_pago_branchId_paymentDate_idx"
    ON "agencia_pago" ("branchId", "paymentDate");

ALTER TABLE "agencia_pago"
    ADD CONSTRAINT "agencia_pago_agencyId_fkey"
    FOREIGN KEY ("agencyId") REFERENCES "proveedor"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "agencia_pago"
    ADD CONSTRAINT "agencia_pago_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "sucursal"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "agencia_pago"
    ADD CONSTRAINT "agencia_pago_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "usuario"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "agencia_pago"
    ADD CONSTRAINT "agencia_pago_updatedById_fkey"
    FOREIGN KEY ("updatedById") REFERENCES "usuario"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
