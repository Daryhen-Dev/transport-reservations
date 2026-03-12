"use server"

import { z } from "zod"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

const scheduleSchema = z.object({
  routeId: z.string().min(1, "Debe seleccionar una ruta"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Formato inválido (HH:MM)"),
  isActive: z.boolean().default(true),
  currentSlug: z.string(),
})

const updateScheduleSchema = z.object({
  time: z.string().regex(/^\d{2}:\d{2}$/, "Formato inválido (HH:MM)"),
  isActive: z.boolean().default(true),
  currentSlug: z.string(),
})

function revalidate(slug: string) {
  revalidatePath(`/${slug}/horarios`)
}

export async function createTripSchedule(data: unknown): Promise<{ success?: true; error?: string }> {
  const parsed = scheduleSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { routeId, time, isActive, currentSlug } = parsed.data

  const existing = await prisma.tripSchedule.findFirst({ where: { routeId, time } })
  if (existing) return { error: "Ya existe un horario con esa hora para la ruta seleccionada" }

  try {
    await prisma.tripSchedule.create({ data: { routeId, time, isActive } })
    revalidate(currentSlug)
    return { success: true }
  } catch {
    return { error: "Error al crear el horario" }
  }
}

export async function updateTripSchedule(id: string, data: unknown): Promise<{ success?: true; error?: string }> {
  const parsed = updateScheduleSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { time, isActive, currentSlug } = parsed.data

  const existing = await prisma.tripSchedule.findUnique({ where: { id } })
  if (!existing) return { error: "Horario no encontrado" }

  const duplicate = await prisma.tripSchedule.findFirst({
    where: { routeId: existing.routeId, time, NOT: { id } },
  })
  if (duplicate) return { error: "Ya existe un horario con esa hora para la ruta seleccionada" }

  try {
    await prisma.tripSchedule.update({ where: { id }, data: { time, isActive } })
    revalidate(currentSlug)
    return { success: true }
  } catch {
    return { error: "Error al actualizar el horario" }
  }
}

export async function deleteTripSchedule(id: string, currentSlug: string): Promise<{ success?: true; error?: string }> {
  const count = await prisma.trip.count({ where: { scheduleId: id } })
  if (count > 0) return { error: "No se puede eliminar el horario porque tiene viajes asociados" }

  try {
    await prisma.tripSchedule.delete({ where: { id } })
    revalidatePath(`/${currentSlug}/horarios`)
    return { success: true }
  } catch {
    return { error: "Error al eliminar el horario" }
  }
}

export async function toggleTripSchedule(id: string, currentSlug: string): Promise<{ success?: true; error?: string }> {
  const existing = await prisma.tripSchedule.findUnique({ where: { id } })
  if (!existing) return { error: "Horario no encontrado" }

  try {
    await prisma.tripSchedule.update({ where: { id }, data: { isActive: !existing.isActive } })
    revalidatePath(`/${currentSlug}/horarios`)
    return { success: true }
  } catch {
    return { error: "Error al actualizar el horario" }
  }
}
