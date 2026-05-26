"use server"

import { z } from "zod"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { startOfDay, endOfDay } from "date-fns"
import { getActiveBranch } from "@/lib/branch-context"

async function resolveBranchId(): Promise<string | null> {
  const branch = await getActiveBranch()
  return branch?.id ?? null
}

async function verifyTripBranch(tripId: string, branchId: string): Promise<boolean> {
  const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { branchId: true } })
  return trip?.branchId === branchId
}

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

const destinatarioSchema = z.object({
  firstName: z.string().min(1, "El nombre del destinatario es requerido"),
  lastName: z.string().min(1, "El apellido del destinatario es requerido"),
  phone: z.string().optional(),
  documentTypeId: z.string().optional(),
  documentNumber: z.string().optional(),
})

const createCargoReservationSchema = z.object({
  tripId: z.string().min(1, "Debe seleccionar un viaje"),
  weightKg: z.number().positive("El peso debe ser mayor a 0"),
  diameterCm: z.number().positive().optional(),
  widthCm: z.number().positive().optional(),
  heightCm: z.number().positive().optional(),
  lengthCm: z.number().positive().optional(),
  categoriaId: z.string().optional(),
  description: z.string().optional(),
  destinationBranchId: z.string().optional(),
  externalDestination: z.string().optional(),
  destinatario: destinatarioSchema,
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
    categoriaId,
    description,
    destinationBranchId,
    externalDestination,
    destinatario,
    proveedor,
    currentSlug,
    proveedorTypeId,
    reservationStatusId,
  } = parsed.data

  const branchId = await resolveBranchId()
  if (!branchId) return { error: "Sucursal no encontrada" }
  if (!(await verifyTripBranch(tripId, branchId))) return { error: "El viaje no pertenece a esta sucursal" }

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

      const newDestinatario = await tx.destinatario.create({
        data: {
          firstName: destinatario.firstName,
          lastName: destinatario.lastName,
          phone: destinatario.phone ?? undefined,
          documentTypeId: destinatario.documentTypeId || undefined,
          documentNumber: destinatario.documentNumber || undefined,
        },
      })

      await tx.cargoReservation.create({
        data: {
          tripId,
          proveedorId: newProveedor.id,
          categoriaId: categoriaId || undefined,
          destinatarioId: newDestinatario.id,
          description: description || undefined,
          weightKg,
          destinationBranchId: destinationBranchId || undefined,
          externalDestination: externalDestination || undefined,
          diameterCm,
          widthCm,
          heightCm,
          lengthCm,
          reservationStatusId,
        },
      })
    })

    revalidatePath("/reservas")
    return { success: true }
  } catch {
    return { error: "Error al crear la reserva de encomienda" }
  }
}

const quickCargoSchema = z.object({
  scheduleId: z.string().min(1, "Debe seleccionar un horario"),
  date: z.string().min(1, "La fecha es requerida"),
  branchId: z.string().min(1, "La sucursal es requerida"),
  proveedorId: z.string().min(1, "Debe seleccionar un proveedor"),
  categoriaId: z.string().optional(),
  destinatario: destinatarioSchema,
  description: z.string().optional(),
  weightKg: z.number().positive("El peso debe ser mayor a 0"),
  destinationBranchId: z.string().optional(),
  externalDestination: z.string().optional(),
  diameterCm: z.number().positive().optional(),
  widthCm: z.number().positive().optional(),
  heightCm: z.number().positive().optional(),
  lengthCm: z.number().positive().optional(),
  currentSlug: z.string(),
})

export async function createQuickCargoReservation(data: unknown) {
  const parsed = quickCargoSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const {
    scheduleId, date, branchId, proveedorId,
    categoriaId, destinatario, description, weightKg,
    destinationBranchId, externalDestination,
    diameterCm, widthCm, heightCm, lengthCm, currentSlug,
  } = parsed.data

  const resolvedBranchId = await resolveBranchId()
  if (!resolvedBranchId) return { error: "Sucursal no encontrada" }
  if (branchId !== resolvedBranchId) return { error: "La sucursal no coincide con la sesión activa" }

  const schedule = await prisma.tripSchedule.findUnique({ where: { id: scheduleId } })
  if (!schedule) return { error: "Horario no encontrado" }

  const pendienteStatus = await prisma.reservationStatus.findFirst({ where: { name: "CONFIRMADA" } })
  if (!pendienteStatus) return { error: "Estado CONFIRMADA no encontrado" }

  const departureDay = new Date(date + "T00:00:00")
  const start = startOfDay(departureDay)
  const end = endOfDay(departureDay)

  let trip = await prisma.trip.findFirst({
    where: { scheduleId, branchId, departureAt: { gte: start, lte: end } },
    include: { status: true },
  })

  if (!trip) {
    const [hours, minutes] = schedule.time.split(":").map(Number)
    const departureAt = new Date(departureDay)
    departureAt.setHours(hours, minutes, 0, 0)
    const scheduleWithRoute = await prisma.tripSchedule.findUnique({
      where: { id: scheduleId },
      include: { route: true },
    })
    if (!scheduleWithRoute) return { error: "Horario no encontrado" }
    const abiertoStatus = await prisma.tripStatus.findUnique({ where: { name: "ABIERTO" } })
    if (!abiertoStatus) return { error: "Estado ABIERTO no encontrado" }
    trip = await prisma.trip.create({
      data: { departureAt, routeId: scheduleWithRoute.routeId, branchId, scheduleId, statusId: abiertoStatus.id },
      include: { status: true },
    })
  } else if (trip.status.name === "CERRADO") {
    return { error: "Este viaje está cerrado y no acepta nuevas reservas" }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const newDestinatario = await tx.destinatario.create({
        data: {
          firstName: destinatario.firstName,
          lastName: destinatario.lastName,
          phone: destinatario.phone ?? undefined,
          documentTypeId: destinatario.documentTypeId || undefined,
          documentNumber: destinatario.documentNumber || undefined,
        },
      })

      await tx.cargoReservation.create({
        data: {
          tripId: trip.id,
          proveedorId,
          categoriaId: categoriaId || undefined,
          destinatarioId: newDestinatario.id,
          description: description || undefined,
          weightKg,
          destinationBranchId: destinationBranchId || undefined,
          externalDestination: externalDestination || undefined,
          diameterCm,
          widthCm,
          heightCm,
          lengthCm,
          reservationStatusId: pendienteStatus.id,
        },
      })
    })

    revalidatePath("/reservas")
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
    revalidatePath("/reservas")
    return { success: true }
  } catch {
    return { error: "Error al actualizar el estado" }
  }
}

export async function updateCargoStatus(
  cargoReservationId: string,
  cargoStatusId: string,
  currentSlug: string
): Promise<{ success: true } | { error: string }> {
  const reservation = await prisma.cargoReservation.findUnique({
    where: { id: cargoReservationId },
    select: { id: true },
  })
  if (!reservation) return { error: "Encomienda no encontrada" }

  try {
    await prisma.cargoReservation.update({
      where: { id: cargoReservationId },
      data: { cargoStatusId },
    })
    return { success: true }
  } catch {
    return { error: "Error al actualizar el estado de la encomienda" }
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
    revalidatePath("/reservas")
    return { success: true }
  } catch {
    return { error: "Error al eliminar la reserva de encomienda" }
  }
}
