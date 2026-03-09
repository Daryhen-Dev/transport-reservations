import { prisma } from "@/lib/db";

export async function getBranches(agencyId: string) {
  return prisma.branch.findMany({
    where: { agencyId },
    orderBy: { createdAt: "desc" },
  });
}
