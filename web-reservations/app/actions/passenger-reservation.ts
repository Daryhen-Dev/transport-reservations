"use server"

import { z } from "zod"
import { startOfDay, endOfDay } from "date-fns"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

const clienteSchema = z.object({
  firstName: z.string().min(1, "El nombre es requerido"),
  lastName: z.string().min(1, "El apellido es requerido"),
  documentTypeId: z.string().min(1, "El tipo de documento es requerido"),
  documentNumber: z.string().min(1, "El número de documento es requerido"),
  countryId: z.string().min(1, "El país es requerido"),
  birthDate: z.string().optional(),
})

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

const createPassengerReservationSchema = z.object({
  tripId: z.string().min(1, "Debe seleccionar un viaje"),
  seatCount: z.number().int().min(1, "Debe reservar al menos 1 asiento"),
  proveedor: proveedorSchema,
  passengers: z.array(clienteSchema).optional(),
  currentSlug: z.string(),
  proveedorTypeId: z.string().min(1, "El tipo de proveedor es requerido"),
  reservationStatusId: z.string().optional(),
})

export async function createPassengerReservation(data: unknown) {
  const parsed = createPassengerReservationSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { tripId, seatCount, proveedor, passengers, currentSlug, proveedorTypeId } = parsed.data
  let { reservationStatusId } = parsed.data

  if (!reservationStatusId) {
    const pendiente = await prisma.reservationStatus.findFirst({
      where: { name: { contains: "pendiente", mode: "insensitive" } },
    })
    if (!pendiente) return { error: "No se encontró el estado 'pendiente'" }
    reservationStatusId = pendiente.id
  }

  try {
    let createdId: string | undefined
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

      const reservation = await tx.passengerReservation.create({
        data: {
          tripId,
          proveedorId: newProveedor.id,
          seatCount,
          reservationStatusId: reservationStatusId!,
        },
      })
      createdId = reservation.id

      if (passengers && passengers.length > 0) {
        for (const c of passengers) {
          // Upsert passenger by unique document
          const p = await tx.passenger.upsert({
            where: { documentTypeId_documentNumber: { documentTypeId: c.documentTypeId, documentNumber: c.documentNumber } },
            create: {
              firstName: c.firstName,
              lastName: c.lastName,
              documentTypeId: c.documentTypeId,
              documentNumber: c.documentNumber,
              countryId: c.countryId,
              birthDate: c.birthDate ? new Date(c.birthDate) : undefined,
            },
            update: {},
          })
          await tx.reservationPassenger.create({
            data: { reservationId: reservation.id, passengerId: p.id },
          })
        }
      }
    })

    revalidatePath(`/${currentSlug}/reservas-pasajeros`)
    return { success: true, id: createdId }
  } catch {
    return { error: "Error al crear la reserva" }
  }
}

const quickReservationSchema = z.object({
  scheduleId: z.string().min(1, "Debe seleccionar un horario"),
  date: z.string().min(1, "La fecha es requerida"),
  proveedorId: z.string().min(1, "Debe seleccionar un proveedor"),
  seatCount: z.number().int().min(1, "Debe reservar al menos 1 asiento"),
  branchId: z.string().min(1, "La sucursal es requerida"),
  currentSlug: z.string(),
})

export async function createQuickPassengerReservation(data: unknown) {
  const parsed = quickReservationSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { scheduleId, date, proveedorId, seatCount, branchId, currentSlug } = parsed.data

  const departureDay = new Date(date + "T00:00:00")
  const start = startOfDay(departureDay)
  const end = endOfDay(departureDay)

  const schedule = await prisma.tripSchedule.findUnique({
    where: { id: scheduleId },
  })
  if (!schedule) return { error: "Horario no encontrado" }

  let trip = await prisma.trip.findFirst({
    where: {
      scheduleId,
      branchId,
      departureAt: { gte: start, lte: end },
    },
  })

  if (!trip) {
    const [hours, minutes] = schedule.time.split(":").map(Number)
    const departureAt = new Date(departureDay)
    departureAt.setHours(hours, minutes, 0, 0)

    trip = await prisma.trip.create({
      data: {
        departureAt,
        routeId: schedule.routeId,
        branchId,
        scheduleId,
      },
    })
  }

  const pendingStatus = await prisma.reservationStatus.findFirst({
    where: { name: { contains: "pendiente", mode: "insensitive" } },
  })
  if (!pendingStatus) return { error: "Estado pendiente no configurado" }

  try {
    const reservation = await prisma.passengerReservation.create({
      data: {
        tripId: trip.id,
        proveedorId,
        seatCount,
        reservationStatusId: pendingStatus.id,
      },
    })
    revalidatePath(`/${currentSlug}/reservas-pasajeros`)
    revalidatePath(`/${currentSlug}/calendario`)
    return { success: true, id: reservation.id }
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

export async function getPassengersForReservation(reservationId: string) {
  try {
    const links = await prisma.reservationPassenger.findMany({
      where: { reservationId },
      include: {
        passenger: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            documentType: { select: { id: true, name: true } },
            documentNumber: true,
            country: { select: { id: true, name: true } },
            birthDate: true,
          },
        },
      },
      orderBy: { passenger: { createdAt: "asc" } },
    })
    return { passengers: links.map((rp) => rp.passenger) }
  } catch {
    return { error: "Error al cargar los pasajeros" }
  }
}

const createPassengerSchema = z.object({
  firstName: z.string().min(1, "El nombre es requerido"),
  lastName: z.string().min(1, "El apellido es requerido"),
  documentTypeId: z.string().min(1, "El tipo de documento es requerido"),
  documentNumber: z.string().min(1, "El número de documento es requerido"),
  countryId: z.string().min(1, "El país es requerido"),
  birthDate: z.string().optional(),
  currentSlug: z.string(),
})

export async function createPassengerAction(data: unknown) {
  const parsed = createPassengerSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { firstName, lastName, documentTypeId, documentNumber, countryId, birthDate, currentSlug } = parsed.data

  const duplicate = await prisma.passenger.findUnique({
    where: { documentTypeId_documentNumber: { documentTypeId, documentNumber } },
  })
  if (duplicate) return { error: `Ya existe un pasajero con ese tipo y número de documento (${documentNumber})` }

  try {
    const passenger = await prisma.passenger.create({
      data: {
        firstName,
        lastName,
        documentTypeId,
        documentNumber,
        countryId,
        birthDate: birthDate ? new Date(birthDate) : undefined,
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
    })
    revalidatePath(`/${currentSlug}/reservas-pasajeros`)
    return { passenger }
  } catch {
    return { error: "Error al crear el pasajero" }
  }
}

const linkPassengerSchema = z.object({
  reservationId: z.string().min(1),
  passengerId: z.string().min(1),
  currentSlug: z.string(),
})

export async function linkPassengerToReservation(data: unknown) {
  const parsed = linkPassengerSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { reservationId, passengerId, currentSlug } = parsed.data

  const existing = await prisma.reservationPassenger.findUnique({
    where: { reservationId_passengerId: { reservationId, passengerId } },
  })
  if (existing) return { error: "El pasajero ya está en esta reserva" }

  try {
    await prisma.reservationPassenger.create({
      data: { reservationId, passengerId },
    })
    const passenger = await prisma.passenger.findUnique({
      where: { id: passengerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        documentType: { select: { id: true, name: true } },
        documentNumber: true,
        country: { select: { id: true, name: true } },
        birthDate: true,
      },
    })
    revalidatePath(`/${currentSlug}/reservas-pasajeros`)
    revalidatePath(`/${currentSlug}/calendario`)
    return { passenger }
  } catch {
    return { error: "Error al agregar el pasajero a la reserva" }
  }
}

export async function removePassengerFromReservation(passengerId: string, reservationId: string, currentSlug: string) {
  try {
    await prisma.reservationPassenger.delete({
      where: { reservationId_passengerId: { reservationId, passengerId } },
    })
    revalidatePath(`/${currentSlug}/reservas-pasajeros`)
    revalidatePath(`/${currentSlug}/calendario`)
    return { success: true }
  } catch {
    return { error: "Error al eliminar el pasajero de la reserva" }
  }
}

const updateReservationSchema = z.object({
  id: z.string().min(1),
  seatCount: z.number().int().min(1, "Mínimo 1 asiento"),
  tripId: z.string().min(1, "Debe seleccionar un viaje"),
  currentSlug: z.string(),
})

export async function updatePassengerReservation(data: unknown) {
  const parsed = updateReservationSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { id, seatCount, tripId, currentSlug } = parsed.data

  try {
    await prisma.passengerReservation.update({
      where: { id },
      data: { seatCount, tripId },
    })
    revalidatePath(`/${currentSlug}/reservas-pasajeros`)
    revalidatePath(`/${currentSlug}/calendario`)
    return { success: true }
  } catch {
    return { error: "Error al actualizar la reserva" }
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
      // ReservationPassenger rows are deleted via onDelete: Cascade on PassengerReservation
      prisma.passengerReservation.delete({ where: { id } }),
    ])
    revalidatePath(`/${currentSlug}/reservas-pasajeros`)
    return { success: true }
  } catch {
    return { error: "Error al eliminar la reserva" }
  }
}
