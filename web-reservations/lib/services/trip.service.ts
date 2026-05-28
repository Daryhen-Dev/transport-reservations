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
      // Just enough to compute "are all reserved seats linked to passengers?"
      passengerReservations: {
        where: { NOT: { reservationStatus: { name: "CANCELADA" } } },
        select: {
          id: true,
          seatCount: true,
          _count: { select: { passengers: true } },
          reservationStatus: { select: { name: true } },
        },
      },
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

export async function getTripDetail(id: string) {
  return prisma.trip.findUnique({
    where: { id },
    include: {
      route: { select: { id: true, origin: true, destination: true } },
      branch: { select: { id: true, name: true, slug: true } },
      status: { select: { id: true, name: true } },
      schedule: { select: { id: true, time: true, isActive: true } },
      crew: {
        include: {
          crewMember: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              documentNumber: true,
              phone: true,
              documentType: { select: { name: true } },
            },
          },
          crewRole: { select: { id: true, name: true } },
        },
        orderBy: { crewRole: { name: "asc" } },
      },
      manifest: { select: { id: true, code: true, createdAt: true } },
      passengerReservations: {
        include: {
          proveedor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
              phone: true,
              proveedorType: { select: { name: true } },
            },
          },
          reservationStatus: { select: { id: true, name: true } },
          passengers: {
            include: {
              passenger: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  documentNumber: true,
                  documentType: { select: { name: true } },
                  country: { select: { nationality: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      cargoReservations: {
        include: {
          proveedor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
            },
          },
          categoria: { select: { id: true, name: true } },
          destinatario: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          destinationBranch: { select: { id: true, name: true } },
          reservationStatus: { select: { id: true, name: true } },
          cargoStatus: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
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
