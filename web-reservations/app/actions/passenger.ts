"use server"

import { z } from "zod"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

const createPassengerSchema = z.object({
  firstName: z.string().min(1, "El nombre es requerido"),
  lastName: z.string().min(1, "El apellido es requerido"),
  documentTypeId: z.string().min(1, "El tipo de documento es requerido"),
  documentNumber: z.string().min(1, "El número de documento es requerido"),
  countryId: z.string().min(1, "El país es requerido"),
  birthDate: z.string().optional(),
  phone: z.string().optional(),
  currentSlug: z.string(),
})

export async function createPassenger(data: unknown) {
  const parsed = createPassengerSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { firstName, lastName, documentTypeId, documentNumber, countryId, birthDate, phone, currentSlug } = parsed.data

  const duplicate = await prisma.passenger.findUnique({
    where: { documentTypeId_documentNumber: { documentTypeId, documentNumber } },
  })
  if (duplicate) return { error: `Ya existe un pasajero con ese tipo y número de documento (${documentNumber})` }

  try {
    await prisma.passenger.create({
      data: { firstName, lastName, documentTypeId, documentNumber, countryId, birthDate: birthDate ? new Date(birthDate) : undefined, phone: phone || null },
    })
    revalidatePath(`/${currentSlug}/pasajeros`)
    return { success: true }
  } catch {
    return { error: "Error al crear el pasajero" }
  }
}

const updatePassengerSchema = z.object({
  id: z.string().min(1),
  firstName: z.string().min(1, "El nombre es requerido"),
  lastName: z.string().min(1, "El apellido es requerido"),
  documentTypeId: z.string().min(1, "El tipo de documento es requerido"),
  documentNumber: z.string().min(1, "El número de documento es requerido"),
  countryId: z.string().min(1, "El país es requerido"),
  birthDate: z.string().optional(),
  phone: z.string().optional(),
  currentSlug: z.string(),
})

export async function updatePassenger(data: unknown) {
  const parsed = updatePassengerSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { id, firstName, lastName, documentTypeId, documentNumber, countryId, birthDate, phone, currentSlug } = parsed.data

  // Check duplicate document on another passenger
  const duplicate = await prisma.passenger.findFirst({
    where: { documentTypeId, documentNumber, NOT: { id } },
  })
  if (duplicate) return { error: `Ya existe otro pasajero con ese tipo y número de documento (${documentNumber})` }

  try {
    await prisma.passenger.update({
      where: { id },
      data: {
        firstName,
        lastName,
        documentTypeId,
        documentNumber,
        countryId,
        birthDate: birthDate ? new Date(birthDate) : null,
        phone: phone || null,
      },
    })
    revalidatePath(`/${currentSlug}/pasajeros`)
    return { success: true }
  } catch {
    return { error: "Error al actualizar el pasajero" }
  }
}

export async function deletePassenger(id: string, currentSlug: string) {
  const passenger = await prisma.passenger.findUnique({
    where: { id },
    include: { _count: { select: { reservations: true } } },
  })

  if (!passenger) return { error: "Pasajero no encontrado" }
  if (passenger._count.reservations > 0) {
    return { error: "No se puede eliminar un pasajero que participó en una reserva" }
  }

  try {
    await prisma.passenger.delete({ where: { id } })
    revalidatePath(`/${currentSlug}/pasajeros`)
    return { success: true }
  } catch {
    return { error: "Error al eliminar el pasajero" }
  }
}
