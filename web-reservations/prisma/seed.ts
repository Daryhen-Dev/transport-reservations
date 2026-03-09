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
  // Roles
  for (const name of ROLE_NAMES) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // Super admin
  const superAdminRole = await prisma.role.findUniqueOrThrow({
    where: { name: "SUPER_ADMIN" },
  });

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

  // Agency (única)
  const agency = await prisma.agency.upsert({
    where: { id: "agency_main" },
    update: {},
    create: {
      id: "agency_main",
      name: "Mi Agencia",
    },
  });

  // Sucursal inicial "main"
  await prisma.branch.upsert({
    where: { slug: "main" },
    update: {},
    create: {
      name: "Principal",
      slug: "main",
      agencyId: agency.id,
    },
  });

  console.log("Seed completado:");
  console.log("  → Super admin: admin@system.com / Admin1234!");
  console.log("  → Agencia: Mi Agencia");
  console.log("  → Sucursal inicial: Principal (slug: main)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
