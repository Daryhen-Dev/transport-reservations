import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

const ROLE_NAMES = ["SUPER_ADMIN", "AGENCY_ADMIN", "SUCURSAL_USER"] as const;

async function main() {
  // 1. Roles
  for (const name of ROLE_NAMES) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { name: "SUPER_ADMIN" } });
  const agencyAdminRole = await prisma.role.findUniqueOrThrow({ where: { name: "AGENCY_ADMIN" } });

  // 2. Super admin
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

  // 3. Agency (única, ID fijo para idempotencia)
  const agency = await prisma.agency.upsert({
    where: { id: "agency_main" },
    update: {},
    create: {
      id: "agency_main",
      name: "Mi Agencia",
    },
  });

  // 4. Sucursal inicial "main"
  await prisma.branch.upsert({
    where: { slug: "main" },
    update: {},
    create: {
      name: "Principal",
      slug: "main",
      agencyId: agency.id,
    },
  });

  // 5. Agency admin (vinculado a la agencia)
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
  console.log("  → Super admin:   admin@system.com  / Admin1234!");
  console.log("  → Agency admin:  admin@agencia.com / Agencia1234!");
  console.log("  → Agencia:       Mi Agencia");
  console.log("  → Sucursal:      Principal (slug: main)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
