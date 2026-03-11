"use server"

import { z } from "zod"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

const tripSchema = z.object({
  departureAt: z.string().min(1, "Debe ingresar la fecha y hora de salida"),
  routeId: z.string().min(1, "Debe seleccionar una ruta"),
  branchId: z.string().min(1, "Debe seleccionar una sucursal"),
  currentSlug: z.string(),
})

function revalidate(slug: string) {
  revalidatePath(`/${slug}/viajes`)
}

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

export async function createTrip(data: unknown) {
  const parsed = tripSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { departureAt, routeId, branchId, currentSlug } = parsed.data
  const departureDate = new Date(departureAt)

  if (isNaN(departureDate.getTime())) {
    return { error: "Fecha de salida inválida" }
  }

  // Check max 2 trips per day per branch
  const dayStart = startOfDay(departureDate)
  const dayEnd = endOfDay(departureDate)

  const count = await prisma.trip.count({
    where: {
      branchId,
      departureAt: { gte: dayStart, lte: dayEnd },
    },
  })

  if (count >= 2) {
    return { error: "Ya existen 2 viajes para esa sucursal en el día seleccionado" }
  }

  try {
    await prisma.trip.create({ data: { departureAt: departureDate, routeId, branchId } })
    revalidate(currentSlug)
    return { success: true }
  } catch {
    return { error: "Error al crear el viaje" }
  }
}

export async function updateTrip(id: string, data: unknown) {
  const parsed = tripSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { departureAt, routeId, branchId, currentSlug } = parsed.data
  const departureDate = new Date(departureAt)

  if (isNaN(departureDate.getTime())) {
    return { error: "Fecha de salida inválida" }
  }

  // Check max 2 trips per day per branch (exclude self)
  const dayStart = startOfDay(departureDate)
  const dayEnd = endOfDay(departureDate)

  const count = await prisma.trip.count({
    where: {
      branchId,
      departureAt: { gte: dayStart, lte: dayEnd },
      NOT: { id },
    },
  })

  if (count >= 2) {
    return { error: "Ya existen 2 viajes para esa sucursal en el día seleccionado" }
  }

  try {
    await prisma.trip.update({ where: { id }, data: { departureAt: departureDate, routeId, branchId } })
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
