import { PrismaClient } from "../lib/generated/prisma/client";
import { Role } from "../lib/generated/prisma/enums";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = "admin@system.com";
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    console.log("Super admin already exists, skipping seed.");
    return;
  }

  const password = await bcrypt.hash("Admin1234!", 12);

  await prisma.user.create({
    data: {
      name: "Super Admin",
      email,
      password,
      role: Role.SUPER_ADMIN,
    },
  });

  console.log("Super admin created: admin@system.com");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
