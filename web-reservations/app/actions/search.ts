"use server"

import { searchProveedoresByType } from "@/lib/services/proveedor.service"
import { prisma } from "@/lib/db"

export async function searchProveedoresAction(query: string, proveedorTypeId?: string) {
  if (query.length < 2) return []
  return searchProveedoresByType(query, proveedorTypeId)
}

export async function searchPassengersAction(query: string) {
  if (query.length < 2) return []
  return prisma.passenger.findMany({
    where: {
      OR: [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { documentNumber: { contains: query, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      documentType: { select: { id: true, name: true } },
      documentNumber: true,
      country: { select: { id: true, name: true } },
      birthDate: true,
    },
    take: 10,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  })
}
