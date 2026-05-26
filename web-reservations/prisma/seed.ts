import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ─── Catálogos ────────────────────────────────────────────────────────────────

const ROLES = ["OWNER", "SUCURSAL_USER"] as const;

const DOCUMENT_TYPES = ["CEDULA DE IDENTIDAD", "PASAPORTE", "RUC"] as const;

const RESERVATION_STATUSES = ["PENDIENTE", "CONFIRMADA", "CANCELADA"] as const;

const CUSTOMER_TYPES = ["PERSONA", "EMPRESA"] as const;

const CARGA_CATEGORIAS = [
  "DOCUMENTOS",
  "ELECTRONICA",
  "ALIMENTOS",
  "ROPA",
  "MEDICAMENTOS",
  "OTROS",
] as const;

const CREW_ROLES = ["CAPITAN", "PRIMER_OFICIAL", "MAQUINISTA"] as const;

const TRIP_STATUSES = [
  { id: "tripstatus_abierto", name: "ABIERTO" },
  { id: "tripstatus_cerrado", name: "CERRADO" },
] as const

const CARGO_STATUSES = [
  { id: "cargostatus_transito",    name: "EN TRANSITO" },
  { id: "cargostatus_entregada",   name: "ENTREGADA" },
  { id: "cargostatus_noreclamada", name: "NO RECLAMADA" },
  { id: "cargostatus_devuelta",    name: "DEVUELTA" },
] as const;

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

  // 5. Categorías de carga
  for (const name of CARGA_CATEGORIAS) {
    await prisma.cargaCategoria.upsert({ where: { name }, update: {}, create: { name } });
  }

  // 6. Estados de viaje
  for (const { id, name } of TRIP_STATUSES) {
    await prisma.tripStatus.upsert({ where: { name }, update: {}, create: { id, name } });
  }

  // 7. Roles de tripulación
  for (const name of CREW_ROLES) {
    await prisma.crewRole.upsert({ where: { name }, update: {}, create: { name } });
  }

  // 7b. Estados de cargo (encomiendas en tránsito)
  for (const { id, name } of CARGO_STATUSES) {
    await prisma.cargoStatus.upsert({ where: { name }, update: {}, create: { id, name } });
  }

  // 8. Países
  for (const country of COUNTRIES) {
    await prisma.country.upsert({
      where: { code: country.code },
      update: { name: country.name, nationality: country.nationality },
      create: country,
    });
  }

  // 9. Sucursal principal
  const principalBranch = await prisma.branch.upsert({
    where: { slug: "principal" },
    update: {},
    create: { name: "Principal", slug: "principal" },
  });

  // 10. Usuarios del sistema
  const ownerRole        = await prisma.role.findUniqueOrThrow({ where: { name: "OWNER" } });
  const sucursalUserRole = await prisma.role.findUniqueOrThrow({ where: { name: "SUCURSAL_USER" } });

  // 10a. OWNER (sin sucursal)
  await prisma.user.upsert({
    where: { email: "owner@system.com" },
    update: {},
    create: {
      name: "Owner",
      email: "owner@system.com",
      password: await bcrypt.hash("Admin1234!", 12),
      roleId: ownerRole.id,
      branchId: null,
    },
  });

  // 10b. SUCURSAL_USER (ligado a sucursal principal)
  await prisma.user.upsert({
    where: { email: "user@system.com" },
    update: {},
    create: {
      name: "Usuario Sucursal",
      email: "user@system.com",
      password: await bcrypt.hash("User1234!", 12),
      roleId: sucursalUserRole.id,
      branchId: principalBranch.id,
    },
  });

  console.log("Seed completado:");
  console.log("  → OWNER:              owner@system.com / Admin1234!");
  console.log("  → SUCURSAL_USER:      user@system.com  / User1234!");
  console.log("  → Sucursal:           Principal (slug: principal)");
  console.log(`  → Países:             ${COUNTRIES.length}`);
  console.log("  → Tipos de documento: CEDULA DE IDENTIDAD, PASAPORTE, RUC");
  console.log("  → Estados de reserva: PENDIENTE, CONFIRMADA, CANCELADA");
  console.log("  → Tipos de cliente:   PERSONA, EMPRESA");
  console.log(`  → Categorías de carga: ${CARGA_CATEGORIAS.join(", ")}`);
  console.log(`  → Roles de tripulación: ${CREW_ROLES.join(", ")}`);
  console.log(`  → Estados de viaje: ${TRIP_STATUSES.map((s) => s.name).join(", ")}`);
  console.log(`  → Estados de cargo: ${CARGO_STATUSES.map((s) => s.name).join(", ")}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
