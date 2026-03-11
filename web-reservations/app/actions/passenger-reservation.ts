"use server"

import { z } from "zod"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

const passengerSchema = z.object({
  firstName: z.string().min(1, "El nombre es requerido"),
  lastName: z.string().min(1, "El apellido es requerido"),
  documentTypeId: z.string().min(1, "El tipo de documento es requerido"),
  documentNumber: z.string().min(1, "El número de documento es requerido"),
  countryId: z.string().min(1, "El país es requerido"),
  birthDate: z.string().optional(),
})

const personaCustomerSchema = z.object({
  customerType: z.literal("PERSONA"),
  firstName: z.string().min(1, "El nombre es requerido"),
  lastName: z.string().min(1, "El apellido es requerido"),
  documentTypeId: z.string().min(1, "El tipo de documento es requerido"),
  documentNumber: z.string().min(1, "El número de documento es requerido"),
  countryId: z.string().min(1, "El país es requerido"),
  birthDate: z.string().optional(),
})

const empresaCustomerSchema = z.object({
  customerType: z.literal("EMPRESA"),
  companyName: z.string().min(1, "El nombre de la empresa es requerido"),
  taxId: z.string().min(1, "El RIF/NIT es requerido"),
  contactName: z.string().optional(),
})

const customerSchema = z.discriminatedUnion("customerType", [
  personaCustomerSchema,
  empresaCustomerSchema,
])

const createPassengerReservationSchema = z.object({
  tripId: z.string().min(1, "Debe seleccionar un viaje"),
  seatCount: z.number().int().min(1, "Debe reservar al menos 1 asiento"),
  customer: customerSchema,
  passengers: z.array(passengerSchema).optional(),
  currentSlug: z.string(),
  customerTypeId: z.string().min(1, "El tipo de cliente es requerido"),
  reservationStatusId: z.string().min(1, "El estado es requerido"),
})

export async function createPassengerReservation(data: unknown) {
  const parsed = createPassengerReservationSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { tripId, seatCount, customer, passengers, currentSlug, customerTypeId, reservationStatusId } = parsed.data

  try {
    await prisma.$transaction(async (tx) => {
      const newCustomer = await tx.customer.create({
        data:
          customer.customerType === "PERSONA"
            ? {
                customerTypeId,
                firstName: customer.firstName,
                lastName: customer.lastName,
                documentTypeId: customer.documentTypeId,
                documentNumber: customer.documentNumber,
                countryId: customer.countryId,
                birthDate: customer.birthDate ? new Date(customer.birthDate) : undefined,
              }
            : {
                customerTypeId,
                companyName: customer.companyName,
                taxId: customer.taxId,
                contactName: customer.contactName ?? undefined,
              },
      })

      const reservation = await tx.passengerReservation.create({
        data: {
          tripId,
          customerId: newCustomer.id,
          seatCount,
          reservationStatusId,
        },
      })

      if (passengers && passengers.length > 0) {
        await tx.passenger.createMany({
          data: passengers.map((p) => ({
            reservationId: reservation.id,
            firstName: p.firstName,
            lastName: p.lastName,
            documentTypeId: p.documentTypeId,
            documentNumber: p.documentNumber,
            countryId: p.countryId,
            birthDate: p.birthDate ? new Date(p.birthDate) : undefined,
          })),
        })
      }
    })

    revalidatePath(`/${currentSlug}/reservas-pasajeros`)
    return { success: true }
  } catch {
    return { error: "Error al crear la reserva" }
  }
}

export async function updateReservationStatus(id: string, statusId: string, currentSlug: string) {
  if (!statusId) return { error: "Estado requerido" }

  try {
    await prisma.passengerReservation.update({
      where: { id },
      data: { reservationStatusId: statusId },
    })
    revalidatePath(`/${currentSlug}/reservas-pasajeros`)
    return { success: true }
  } catch {
    return { error: "Error al actualizar el estado" }
  }
}

export async function deletePassengerReservation(id: string, currentSlug: string) {
  // Only allow delete if PENDIENTE
  const reservation = await prisma.passengerReservation.findUnique({
    where: { id },
    include: { reservationStatus: { select: { name: true } } },
  })

  if (!reservation) return { error: "Reserva no encontrada" }
  if (reservation.reservationStatus.name !== "PENDIENTE") {
    return { error: "Solo se pueden eliminar reservas en estado PENDIENTE" }
  }

  try {
    await prisma.$transaction([
      prisma.passenger.deleteMany({ where: { reservationId: id } }),
      prisma.passengerReservation.delete({ where: { id } }),
    ])
    revalidatePath(`/${currentSlug}/reservas-pasajeros`)
    return { success: true }
  } catch {
    return { error: "Error al eliminar la reserva" }
  }
}
