import { prisma } from "@/lib/db";

export async function getUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function getUsersByAgency(agencyId: string) {
  return prisma.user.findMany({
    where: {
      branch: { agencyId },
    },
    include: {
      branch: { select: { name: true } },
      role: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
