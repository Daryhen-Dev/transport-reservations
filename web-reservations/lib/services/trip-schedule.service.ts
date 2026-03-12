import { prisma } from "@/lib/db";

export async function getTripSchedules() {
  return prisma.tripSchedule.findMany({
    include: {
      route: { select: { id: true, origin: true, destination: true, branchId: true } },
    },
    orderBy: { time: "asc" },
  });
}

export async function getTripSchedulesByRoute(routeId: string) {
  return prisma.tripSchedule.findMany({
    where: { routeId, isActive: true },
    orderBy: { time: "asc" },
  });
}

export async function getTripSchedulesByBranch(branchId: string) {
  return prisma.tripSchedule.findMany({
    where: {
      isActive: true,
      route: { branchId },
    },
    include: {
      route: true,
    },
    orderBy: [{ route: { origin: "asc" } }, { time: "asc" }],
  })
}
