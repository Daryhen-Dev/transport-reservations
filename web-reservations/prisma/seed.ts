import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ─── Catálogos ────────────────────────────────────────────────────────────────

const ROLES = ["OWNER", "SUCURSAL_USER"] as const;

const DOCUMENT_TYPES = ["CEDULA DE IDENTIDAD", "PASAPORTE", "RUC"] as const;

const RESERVATION_STATUSES = ["PENDIENTE", "CONFIRMADA", "CANCELADA", "TRANSFERIDA"] as const;

const CUSTOMER_TYPES = [
  "PERSONA",
  "AGENCIA",
  "INSTITUCION_PUBLICA",
] as const;

const CARGA_CATEGORIAS = [
  "DOCUMENTOS",
  "ELECTRONICA",
  "ALIMENTOS",
  "ROPA",
  "MEDICAMENTOS",
  "OTROS",
] as const;

const CREW_ROLES = ["CAPITAN", "TRIPULANTE"] as const;

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

  // 4b. Limpieza legacy: EMPRESA fue retirado del catalogo. Si quedo algun
  // registro (por seeds antiguos), migramos sus proveedores a AGENCIA y
  // borramos el tipo.
  const legacyEmpresa = await prisma.proveedorType.findUnique({
    where: { name: "EMPRESA" },
  });
  if (legacyEmpresa) {
    const agencia = await prisma.proveedorType.findUniqueOrThrow({
      where: { name: "AGENCIA" },
    });
    await prisma.proveedor.updateMany({
      where: { proveedorTypeId: legacyEmpresa.id },
      data: { proveedorTypeId: agencia.id },
    });
    await prisma.proveedorType.delete({ where: { id: legacyEmpresa.id } });
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

  // 9. Sucursales
  //
  // Legacy "principal" branch (if it exists) gets consolidated into
  // "san-cristobal":
  //   * If only "principal" exists      → rename in place.
  //   * If only "san-cristobal" exists  → keep it.
  //   * If BOTH exist (mid-test state)  → move every reference from
  //     "principal" to "san-cristobal" and delete "principal".
  const legacyPrincipal = await prisma.branch.findUnique({
    where: { slug: "principal" },
  });

  let sanCristobal: Awaited<ReturnType<typeof prisma.branch.upsert>>;
  if (legacyPrincipal) {
    const existingSC = await prisma.branch.findUnique({
      where: { slug: "san-cristobal" },
    });
    if (!existingSC) {
      // Rename in place
      sanCristobal = await prisma.branch.update({
        where: { id: legacyPrincipal.id },
        data: { name: "San Cristóbal", slug: "san-cristobal" },
      });
    } else {
      // Consolidate: move every reference, then delete principal
      await prisma.user.updateMany({
        where: { branchId: legacyPrincipal.id },
        data: { branchId: existingSC.id },
      });
      await prisma.route.updateMany({
        where: { branchId: legacyPrincipal.id },
        data: { branchId: existingSC.id },
      });
      await prisma.trip.updateMany({
        where: { branchId: legacyPrincipal.id },
        data: { branchId: existingSC.id },
      });
      await prisma.cargoReservation.updateMany({
        where: { destinationBranchId: legacyPrincipal.id },
        data: { destinationBranchId: existingSC.id },
      });
      await prisma.tripManifest.updateMany({
        where: { receivedByBranchId: legacyPrincipal.id },
        data: { receivedByBranchId: existingSC.id },
      });
      await prisma.branch.delete({ where: { id: legacyPrincipal.id } });
      sanCristobal = await prisma.branch.update({
        where: { id: existingSC.id },
        data: { name: "San Cristóbal" },
      });
    }
  } else {
    sanCristobal = await prisma.branch.upsert({
      where: { slug: "san-cristobal" },
      update: { name: "San Cristóbal" },
      create: { name: "San Cristóbal", slug: "san-cristobal" },
    });
  }

  const santaCruz = await prisma.branch.upsert({
    where: { slug: "santa-cruz" },
    update: { name: "Santa Cruz" },
    create: { name: "Santa Cruz", slug: "santa-cruz" },
  });

  // 9b. Rutas predeterminadas (cada ruta pertenece a la sucursal de origen).
  //     Las tarifas son globales fijas (ver lib/pricing.ts) — la ruta solo
  //     define origen, destino y sucursal.
  const ROUTES_SEED = [
    { origin: "San Cristóbal", destination: "Santa Cruz", branchId: sanCristobal.id },
    { origin: "Santa Cruz",    destination: "San Cristóbal", branchId: santaCruz.id },
  ];
  for (const r of ROUTES_SEED) {
    const existing = await prisma.route.findFirst({
      where: {
        origin: r.origin,
        destination: r.destination,
        branchId: r.branchId,
      },
    });
    if (!existing) {
      await prisma.route.create({ data: r });
    }
  }

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

  // Migrate legacy user@system.com → sancristobal@system.com (rename in place).
  await prisma.user.updateMany({
    where: { email: "user@system.com" },
    data: { email: "sancristobal@system.com", name: "Usuario San Cristóbal" },
  });

  // 10b. SUCURSAL_USER de San Cristóbal
  await prisma.user.upsert({
    where: { email: "sancristobal@system.com" },
    update: { branchId: sanCristobal.id },
    create: {
      name: "Usuario San Cristóbal",
      email: "sancristobal@system.com",
      password: await bcrypt.hash("User1234!", 12),
      roleId: sucursalUserRole.id,
      branchId: sanCristobal.id,
    },
  });

  // 10c. SUCURSAL_USER de Santa Cruz
  await prisma.user.upsert({
    where: { email: "santacruz@system.com" },
    update: { branchId: santaCruz.id },
    create: {
      name: "Usuario Santa Cruz",
      email: "santacruz@system.com",
      password: await bcrypt.hash("User1234!", 12),
      roleId: sucursalUserRole.id,
      branchId: santaCruz.id,
    },
  });

  console.log("Seed completado:");
  console.log("  → OWNER:              owner@system.com         / Admin1234!");
  console.log("  → SUCURSAL_USER (SC): sancristobal@system.com  / User1234!");
  console.log("  → SUCURSAL_USER (SZ): santacruz@system.com     / User1234!");
  console.log("  → Sucursales:         San Cristóbal, Santa Cruz");
  console.log("  → Rutas:              San Cristóbal ↔ Santa Cruz (2 rutas)");
  console.log(`  → Países:             ${COUNTRIES.length}`);
  console.log("  → Tipos de documento: CEDULA DE IDENTIDAD, PASAPORTE, RUC");
  console.log("  → Estados de reserva: PENDIENTE, CONFIRMADA, CANCELADA, TRANSFERIDA");
  console.log("  → Tipos de proveedor: PERSONA, AGENCIA, INSTITUCION_PUBLICA");
  console.log(`  → Categorías de carga: ${CARGA_CATEGORIAS.join(", ")}`);
  console.log(`  → Roles de tripulación: ${CREW_ROLES.join(", ")}`);
  console.log(`  → Estados de viaje: ${TRIP_STATUSES.map((s) => s.name).join(", ")}`);
  console.log(`  → Estados de cargo: ${CARGO_STATUSES.map((s) => s.name).join(", ")}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
