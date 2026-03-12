"use server"

import { z } from "zod"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

const personaProveedorSchema = z.object({
  customerType: z.literal("PERSONA"),
  firstName: z.string().min(1, "El nombre es requerido"),
  lastName: z.string().min(1, "El apellido es requerido"),
  documentTypeId: z.string().min(1, "El tipo de documento es requerido"),
  documentNumber: z.string().min(1, "El número de documento es requerido"),
  countryId: z.string().min(1, "El país es requerido"),
  birthDate: z.string().optional(),
})

const empresaProveedorSchema = z.object({
  customerType: z.literal("EMPRESA"),
  companyName: z.string().min(1, "El nombre de la empresa es requerido"),
  taxId: z.string().min(1, "El RIF/NIT es requerido"),
  contactName: z.string().optional(),
})

const proveedorSchema = z.discriminatedUnion("customerType", [
  personaProveedorSchema,
  empresaProveedorSchema,
])

const createCargoReservationSchema = z.object({
  tripId: z.string().min(1, "Debe seleccionar un viaje"),
  weightKg: z.number().positive("El peso debe ser mayor a 0"),
  diameterCm: z.number().positive().optional(),
  widthCm: z.number().positive().optional(),
  heightCm: z.number().positive().optional(),
  lengthCm: z.number().positive().optional(),
  proveedor: proveedorSchema,
  currentSlug: z.string(),
  proveedorTypeId: z.string().min(1, "El tipo de proveedor es requerido"),
  reservationStatusId: z.string().min(1, "El estado es requerido"),
})

export async function createCargoReservation(data: unknown) {
  const parsed = createCargoReservationSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const {
    tripId,
    weightKg,
    diameterCm,
    widthCm,
    heightCm,
    lengthCm,
    proveedor,
    currentSlug,
    proveedorTypeId,
    reservationStatusId,
  } = parsed.data

  try {
    await prisma.$transaction(async (tx) => {
      const newProveedor = await tx.proveedor.create({
        data:
          proveedor.customerType === "PERSONA"
            ? {
                proveedorTypeId,
                firstName: proveedor.firstName,
                lastName: proveedor.lastName,
                documentTypeId: proveedor.documentTypeId,
                documentNumber: proveedor.documentNumber,
                countryId: proveedor.countryId,
                birthDate: proveedor.birthDate ? new Date(proveedor.birthDate) : undefined,
              }
            : {
                proveedorTypeId,
                companyName: proveedor.companyName,
                taxId: proveedor.taxId,
                contactName: proveedor.contactName ?? undefined,
              },
      })

      await tx.cargoReservation.create({
        data: {
          tripId,
          proveedorId: newProveedor.id,
          weightKg,
          diameterCm,
          widthCm,
          heightCm,
          lengthCm,
          reservationStatusId,
        },
      })
    })

    revalidatePath(`/${currentSlug}/reservas-encomiendas`)
    return { success: true }
  } catch {
    return { error: "Error al crear la reserva de encomienda" }
  }
}

export async function updateCargoReservationStatus(id: string, statusId: string, currentSlug: string) {
  if (!statusId) return { error: "Estado requerido" }

  try {
    await prisma.cargoReservation.update({
      where: { id },
      data: { reservationStatusId: statusId },
    })
    revalidatePath(`/${currentSlug}/reservas-encomiendas`)
    return { success: true }
  } catch {
    return { error: "Error al actualizar el estado" }
  }
}

export async function deleteCargoReservation(id: string, currentSlug: string) {
  const reservation = await prisma.cargoReservation.findUnique({
    where: { id },
    include: { reservationStatus: { select: { name: true } } },
  })

  if (!reservation) return { error: "Reserva no encontrada" }
  if (reservation.reservationStatus.name !== "PENDIENTE") {
    return { error: "Solo se pueden eliminar reservas en estado PENDIENTE" }
  }

  try {
    await prisma.cargoReservation.delete({ where: { id } })
    revalidatePath(`/${currentSlug}/reservas-encomiendas`)
    return { success: true }
  } catch {
    return { error: "Error al eliminar la reserva de encomienda" }
  }
}
