import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ─── Catálogos ────────────────────────────────────────────────────────────────

const ROLES = ["SUPER_ADMIN", "AGENCY_ADMIN", "SUCURSAL_USER"] as const;

const DOCUMENT_TYPES = ["CEDULA DE IDENTIDAD", "PASAPORTE", "RUC"] as const;

const RESERVATION_STATUSES = ["PENDIENTE", "CONFIRMADA", "CANCELADA"] as const;

const CUSTOMER_TYPES = ["PERSONA", "EMPRESA"] as const;

const COUNTRIES = [
  { name: "Venezuela",  nationality: "Venezolano/a",  code: "VE" },
  { name: "Colombia",   nationality: "Colombiano/a",   code: "CO" },
  { name: "Perú",       nationality: "Peruano/a",      code: "PE" },
  { name: "Ecuador",    nationality: "Ecuatoriano/a",  code: "EC" },
  { name: "Brasil",     nationality: "Brasileño/a",    code: "BR" },
  { name: "Argentina",  nationality: "Argentino/a",    code: "AR" },
  { name: "Chile",      nationality: "Chileno/a",      code: "CL" },
  { name: "Bolivia",    nationality: "Boliviano/a",    code: "BO" },
  { name: "Uruguay",    nationality: "Uruguayo/a",     code: "UY" },
  { name: "Paraguay",   nationality: "Paraguayo/a",    code: "PY" },
  { name: "Panamá",     nationality: "Panameño/a",     code: "PA" },
  { name: "México",     nationality: "Mexicano/a",     code: "MX" },
  { name: "España",     nationality: "Español/a",      code: "ES" },
  { name: "Estados Unidos", nationality: "Estadounidense", code: "US" },
] as const;

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Roles
  for (const name of ROLES) {
    await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
  }

  // 2. Tipos de documento
  for (const name of DOCUMENT_TYPES) {
    await prisma.documentType.upsert({ where: { name }, update: {}, create: { name } });
  }

  // 3. Estados de reserva
  for (const name of RESERVATION_STATUSES) {
    await prisma.reservationStatus.upsert({ where: { name }, update: {}, create: { name } });
  }

  // 4. Tipos de proveedor
  for (const name of CUSTOMER_TYPES) {
    await prisma.proveedorType.upsert({ where: { name }, update: {}, create: { name } });
  }

  // 5. Países
  for (const country of COUNTRIES) {
    await prisma.country.upsert({
      where: { code: country.code },
      update: { name: country.name, nationality: country.nationality },
      create: country,
    });
  }

  // 6. Usuarios del sistema
  const superAdminRole  = await prisma.role.findUniqueOrThrow({ where: { name: "SUPER_ADMIN" } });
  const agencyAdminRole = await prisma.role.findUniqueOrThrow({ where: { name: "AGENCY_ADMIN" } });

  await prisma.user.upsert({
    where: { email: "admin@system.com" },
    update: {},
    create: {
      name: "Super Admin",
      email: "admin@system.com",
      password: await bcrypt.hash("Admin1234!", 12),
      roleId: superAdminRole.id,
    },
  });

  // 7. Agencia
  const agency = await prisma.agency.upsert({
    where: { id: "agency_main" },
    update: {},
    create: { id: "agency_main", name: "Mi Agencia" },
  });

  // 8. Sucursal inicial
  await prisma.branch.upsert({
    where: { slug: "main" },
    update: {},
    create: { name: "Principal", slug: "main", agencyId: agency.id },
  });

  // 9. Agency admin
  await prisma.user.upsert({
    where: { email: "admin@agencia.com" },
    update: {},
    create: {
      name: "Admin Agencia",
      email: "admin@agencia.com",
      password: await bcrypt.hash("Agencia1234!", 12),
      roleId: agencyAdminRole.id,
      agencyId: agency.id,
    },
  });

  console.log("Seed completado:");
  console.log("  → Super admin:        admin@system.com  / Admin1234!");
  console.log("  → Agency admin:       admin@agencia.com / Agencia1234!");
  console.log("  → Agencia:            Mi Agencia");
  console.log("  → Sucursal:           Principal (slug: main)");
  console.log(`  → Países:             ${COUNTRIES.length}`);
  console.log("  → Tipos de documento: CEDULA_IDENTIDAD, PASAPORTE");
  console.log("  → Estados de reserva: PENDIENTE, CONFIRMADA, CANCELADA");
  console.log("  → Tipos de cliente:   PERSONA, EMPRESA");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
