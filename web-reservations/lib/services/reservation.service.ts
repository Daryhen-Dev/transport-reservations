import { prisma } from "@/lib/db";

export async function getPassengerReservations() {
  return prisma.passengerReservation.findMany({
    include: {
      trip: {
        include: {
          route: { select: { id: true, origin: true, destination: true } },
          branch: { select: { id: true, name: true } },
        },
      },
      proveedor: { select: { id: true, firstName: true, lastName: true, companyName: true, proveedorTypeId: true } },
      reservationStatus: { select: { id: true, name: true } },
      _count: { select: { passengers: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCargoReservations() {
  return prisma.cargoReservation.findMany({
    include: {
      trip: {
        include: {
          route: { select: { id: true, origin: true, destination: true } },
          branch: { select: { id: true, name: true } },
        },
      },
      proveedor: { select: { id: true, firstName: true, lastName: true, companyName: true, proveedorTypeId: true } },
      reservationStatus: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
