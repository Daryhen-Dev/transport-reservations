"use server"

import { z } from "zod"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { startOfDay, endOfDay } from "date-fns"

const tripSchema = z.object({
  departureAt: z.string().min(1, "Debe ingresar la fecha y hora de salida"),
  routeId: z.string().min(1, "Debe seleccionar una ruta"),
  branchId: z.string().min(1, "Debe seleccionar una sucursal"),
  scheduleId: z.string().optional(),
  currentSlug: z.string(),
})

function revalidate(slug: string) {
  revalidatePath(`/${slug}/viajes`)
}

export async function createTrip(data: unknown) {
  const parsed = tripSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { departureAt, routeId, branchId, scheduleId, currentSlug } = parsed.data
  const departureDate = new Date(departureAt)

  if (isNaN(departureDate.getTime())) {
    return { error: "Fecha de salida inválida" }
  }

  if (scheduleId) {
    const dayStart = startOfDay(departureDate)
    const dayEnd = endOfDay(departureDate)
    const count = await prisma.trip.count({
      where: { scheduleId, departureAt: { gte: dayStart, lte: dayEnd } },
    })
    if (count > 0) return { error: "Ya existe un viaje con este horario en la fecha seleccionada" }
  }

  const abiertoStatus = await prisma.tripStatus.findUnique({ where: { name: "ABIERTO" } })
  if (!abiertoStatus) return { error: "Estado ABIERTO no encontrado. Ejecute el seed." }

  try {
    await prisma.trip.create({
      data: { departureAt: departureDate, routeId, branchId, scheduleId, statusId: abiertoStatus.id },
    })
    revalidate(currentSlug)
    return { success: true }
  } catch {
    return { error: "Error al crear el viaje" }
  }
}

export async function closeTripAction(tripId: string, currentSlug: string) {
  const [pendingPassengers, pendingCargo] = await Promise.all([
    prisma.passengerReservation.count({
      where: { tripId, reservationStatus: { name: { equals: "PENDIENTE", mode: "insensitive" } } },
    }),
    prisma.cargoReservation.count({
      where: { tripId, reservationStatus: { name: { equals: "PENDIENTE", mode: "insensitive" } } },
    }),
  ])

  if (pendingPassengers > 0 || pendingCargo > 0) {
    const parts = []
    if (pendingPassengers > 0) parts.push(`${pendingPassengers} reserva(s) de pasajeros`)
    if (pendingCargo > 0) parts.push(`${pendingCargo} encomienda(s)`)
    return { error: `No se puede cerrar el viaje: hay ${parts.join(" y ")} pendiente(s)` }
  }

  const cerradoStatus = await prisma.tripStatus.findUnique({ where: { name: "CERRADO" } })
  if (!cerradoStatus) return { error: "Estado CERRADO no encontrado" }
  try {
    await prisma.trip.update({ where: { id: tripId }, data: { statusId: cerradoStatus.id } })
    revalidatePath(`/${currentSlug}/viajes`)
    return { success: true }
  } catch {
    return { error: "Error al cerrar el viaje" }
  }
}

export async function openTripAction(tripId: string, currentSlug: string) {
  const abiertoStatus = await prisma.tripStatus.findUnique({ where: { name: "ABIERTO" } })
  if (!abiertoStatus) return { error: "Estado ABIERTO no encontrado" }
  try {
    await prisma.trip.update({ where: { id: tripId }, data: { statusId: abiertoStatus.id } })
    revalidatePath(`/${currentSlug}/viajes`)
    return { success: true }
  } catch {
    return { error: "Error al reabrir el viaje" }
  }
}

export async function updateTrip(id: string, data: unknown) {
  const parsed = tripSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { departureAt, routeId, branchId, scheduleId, currentSlug } = parsed.data
  const departureDate = new Date(departureAt)

  if (isNaN(departureDate.getTime())) {
    return { error: "Fecha de salida inválida" }
  }

  try {
    await prisma.trip.update({ where: { id }, data: { departureAt: departureDate, routeId, branchId, scheduleId } })
    revalidate(currentSlug)
    return { success: true }
  } catch {
    return { error: "Error al actualizar el viaje" }
  }
}

export async function deleteTrip(id: string, currentSlug: string) {
  try {
    await prisma.trip.delete({ where: { id } })
    revalidatePath(`/${currentSlug}/viajes`)
    return { success: true }
  } catch {
    return { error: "Error al eliminar el viaje. Puede que tenga reservas asociadas." }
  }
}
