import { prisma } from "@/lib/db";

export async function getPassengerReservationsByBranch(branchId: string) {
  return prisma.passengerReservation.findMany({
    where: { trip: { branchId } },
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

export async function getCargoReservationsByBranch(branchId: string) {
  return prisma.cargoReservation.findMany({
    where: { trip: { branchId } },
    include: {
      trip: {
        include: {
          route: { select: { id: true, origin: true, destination: true } },
          branch: { select: { id: true, name: true } },
        },
      },
      proveedor: { select: { id: true, firstName: true, lastName: true, companyName: true, proveedorTypeId: true } },
      reservationStatus: { select: { id: true, name: true } },
      categoria: { select: { id: true, name: true } },
      destinatario: { select: { id: true, firstName: true, lastName: true, phone: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
