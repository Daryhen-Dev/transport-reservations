"use server"

import { randomBytes } from "crypto"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

function generateCode(branchName: string, departureAt: Date, destination: string): string {
  const O = branchName.replace(/[^a-zA-Z]/g, "").padEnd(2, "X").substring(0, 2).toUpperCase()
  const D = destination.replace(/[^a-zA-Z]/g, "").padEnd(2, "X").substring(0, 2).toUpperCase()
  const yy = departureAt.getFullYear().toString().slice(-2)
  const mm = (departureAt.getMonth() + 1).toString().padStart(2, "0")
  const dd = departureAt.getDate().toString().padStart(2, "0")

  // Interleave initials with date digits: O[0]+YY[0]+O[1]+YY[1]+D[0]+MM[0]+D[1]+MM[1]+DD
  const mixed = `${O[0]}${yy[0]}${O[1]}${yy[1]}${D[0]}${mm[0]}${D[1]}${mm[1]}${dd}`

  // 4 random hex chars for unpredictability
  const rand = randomBytes(2).toString("hex").toUpperCase()

  return `${mixed}${rand}`
}

export async function generateManifestAction(
  tripId: string,
  currentSlug: string
): Promise<{ success: true; code: string } | { error: string }> {
  const branch = await prisma.branch.findUnique({ where: { slug: currentSlug }, select: { id: true } })
  if (!branch) return { error: "Sucursal no encontrada" }

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      branch: { select: { name: true } },
      route: { select: { origin: true, destination: true } },
      status: { select: { name: true } },
      manifest: { select: { code: true } },
    },
  })

  if (!trip) return { error: "Viaje no encontrado" }
  if (trip.branchId !== branch.id) return { error: "El viaje no pertenece a esta sucursal" }
  if (trip.status.name !== "CERRADO") return { error: "Solo se puede generar el manifiesto de viajes cerrados" }

  if (trip.manifest) {
    return { success: true, code: trip.manifest.code }
  }

  const code = generateCode(trip.branch.name, trip.departureAt, trip.route.destination)

  const manifest = await prisma.tripManifest.create({
    data: { code, tripId },
    select: { code: true },
  })

  await prisma.cargoReservation.updateMany({
    where: { tripId, cargoStatusId: null },
    data: { cargoStatusId: "cargostatus_transito" },
  })

  revalidatePath(`/${currentSlug}/viajes`)
  revalidatePath(`/${currentSlug}/encomiendas`)
  return { success: true, code: manifest.code }
}

export async function lookupManifestAction(
  code: string,
  currentSlug: string
): Promise<{ manifest: ManifestData } | { error: string }> {
  if (!code.trim()) return { error: "Ingresá un código de manifiesto" }

  const manifest = await prisma.tripManifest.findUnique({
    where: { code: code.trim().toUpperCase() },
    include: {
      trip: {
        include: {
          branch: { select: { name: true, slug: true } },
          route: { select: { origin: true, destination: true } },
          status: { select: { name: true } },
          crew: {
            include: {
              crewMember: {
                include: {
                  documentType: { select: { name: true } },
                },
              },
              crewRole: { select: { name: true } },
            },
          },
          passengerReservations: {
            where: { reservationStatus: { name: { not: "CANCELADA" } } },
            include: {
              proveedor: {
                select: {
                  firstName: true,
                  lastName: true,
                  companyName: true,
                  proveedorType: { select: { name: true } },
                },
              },
              passengers: {
                include: {
                  passenger: {
                    include: {
                      documentType: { select: { name: true } },
                    },
                  },
                },
              },
            },
          },
          cargoReservations: {
            where: { reservationStatus: { name: { not: "CANCELADA" } } },
            include: {
              categoria: { select: { name: true } },
              destinatario: { select: { firstName: true, lastName: true, phone: true } },
              proveedor: { select: { firstName: true, lastName: true, companyName: true } },
              destinationBranch: { select: { name: true } },
            },
          },
        },
      },
    },
  })

  if (!manifest) return { error: "Código no encontrado" }

  // Record first receipt by this branch (only if different from origin branch)
  if (!manifest.receivedByBranchId) {
    const branch = await prisma.branch.findUnique({ where: { slug: currentSlug }, select: { id: true } })
    if (branch && branch.id !== manifest.trip.branch.id) {
      await prisma.tripManifest.update({
        where: { id: manifest.id },
        data: { receivedByBranchId: branch.id, receivedAt: new Date() },
      })
      revalidatePath(`/${currentSlug}/encomiendas`)
    }
  }

  return { manifest: manifest as ManifestData }
}

export type ManifestData = Awaited<ReturnType<typeof prisma.tripManifest.findUniqueOrThrow>> & {
  trip: {
    branch: { name: string; slug: string }
    route: { origin: string; destination: string }
    status: { name: string }
    departureAt: Date
    crew: {
      crewMember: {
        firstName: string
        lastName: string
        documentNumber: string
        documentType: { name: string }
      }
      crewRole: { name: string }
    }[]
    passengerReservations: {
      seatCount: number
      proveedor: {
        firstName: string | null
        lastName: string | null
        companyName: string | null
        proveedorType: { name: string }
      }
      passengers: {
        passenger: {
          firstName: string
          lastName: string
          documentNumber: string
          documentType: { name: string }
        }
      }[]
    }[]
    cargoReservations: {
      weightKg: number
      description: string | null
      categoria: { name: string } | null
      destinatario: { firstName: string; lastName: string; phone: string | null } | null
      proveedor: { firstName: string | null; lastName: string | null; companyName: string | null }
      destinationBranch: { name: string } | null
      externalDestination: string | null
    }[]
  }
}
