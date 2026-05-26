import { prisma } from "@/lib/db";

export async function getBranches() {
  return prisma.branch.findMany({
    orderBy: { createdAt: "desc" },
  });
}
