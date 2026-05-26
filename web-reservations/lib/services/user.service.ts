import { prisma } from "@/lib/db";

export async function getUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function getAllUsers() {
  return prisma.user.findMany({
    include: {
      branch: { select: { name: true } },
      role: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
