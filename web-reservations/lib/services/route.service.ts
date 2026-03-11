import { prisma } from "@/lib/db";

export async function getRoutes() {
  return prisma.route.findMany({
    include: {
      branch: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getRoutesByBranch(branchId: string) {
  return prisma.route.findMany({
    where: { branchId },
    include: {
      branch: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
