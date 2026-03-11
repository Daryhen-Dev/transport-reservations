import { prisma } from "@/lib/db";

export async function getTrips() {
  return prisma.trip.findMany({
    include: {
      route: { select: { id: true, origin: true, destination: true } },
      branch: { select: { id: true, name: true } },
    },
    orderBy: { departureAt: "desc" },
  });
}

export async function getTripsByBranch(branchId: string) {
  return prisma.trip.findMany({
    where: { branchId },
    include: {
      route: { select: { id: true, origin: true, destination: true } },
      branch: { select: { id: true, name: true } },
    },
    orderBy: { departureAt: "desc" },
  });
}
