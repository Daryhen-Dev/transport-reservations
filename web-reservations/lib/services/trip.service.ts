import { startOfDay, endOfDay } from "date-fns";
import { prisma } from "@/lib/db";

export async function getTrips(branchId?: string) {
  return prisma.trip.findMany({
    where: branchId ? { branchId } : undefined,
    include: {
      route: { select: { id: true, origin: true, destination: true } },
      branch: { select: { id: true, name: true } },
      status: { select: { id: true, name: true } },
      crew: {
        include: {
          crewMember: { select: { id: true, firstName: true, lastName: true } },
          crewRole: { select: { id: true, name: true } },
        },
      },
      manifest: { select: { code: true } },
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

export async function getTripsByDate(date: string, branchId: string) {
  const day = new Date(date + "T00:00:00")
  const start = startOfDay(day)
  const end = endOfDay(day)
  return prisma.trip.findMany({
    where: {
      departureAt: { gte: start, lte: end },
      branchId,
    },
    include: {
      schedule: true,
      route: true,
    },
    orderBy: { departureAt: "asc" },
  })
}
