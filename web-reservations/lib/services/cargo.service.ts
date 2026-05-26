import { prisma } from "@/lib/db"

export async function getCargoByBranch(branchId: string) {
  return prisma.cargoReservation.findMany({
    where: {
      OR: [
        { trip: { branchId } },
        { destinationBranchId: branchId, trip: { manifest: { receivedByBranchId: branchId } } },
      ],
    },
    include: {
      trip: {
        include: {
          route: { select: { origin: true, destination: true } },
          branch: { select: { id: true, name: true } },
          manifest: { select: { code: true } },
        },
      },
      cargoStatus: { select: { id: true, name: true } },
      destinationBranch: { select: { id: true, name: true } },
      proveedor: { select: { id: true, firstName: true, lastName: true, companyName: true } },
      destinatario: { select: { id: true, firstName: true, lastName: true, phone: true } },
      categoria: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function getCargoByManifest(manifestCode: string) {
  const manifest = await prisma.tripManifest.findUnique({
    where: { code: manifestCode },
    include: {
      trip: {
        include: {
          cargoReservations: {
            include: {
              trip: {
                include: {
                  route: { select: { origin: true, destination: true } },
                  branch: { select: { name: true } },
                  manifest: { select: { code: true } },
                },
              },
              cargoStatus: { select: { id: true, name: true } },
              destinationBranch: { select: { id: true, name: true } },
              proveedor: { select: { id: true, firstName: true, lastName: true, companyName: true } },
              destinatario: { select: { id: true, firstName: true, lastName: true, phone: true } },
              categoria: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  })

  return manifest?.trip.cargoReservations ?? []
}
