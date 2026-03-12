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

  try {
    await prisma.trip.create({ data: { departureAt: departureDate, routeId, branchId, scheduleId } })
    revalidate(currentSlug)
    return { success: true }
  } catch {
    return { error: "Error al crear el viaje" }
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
