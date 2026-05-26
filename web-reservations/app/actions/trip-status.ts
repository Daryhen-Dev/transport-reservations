"use server"

import { z } from "zod"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

const schema = z.object({
  name: z.string().min(1, "El nombre es requerido").toUpperCase(),
  currentSlug: z.string(),
})

export async function createTripStatus(data: unknown) {
  const parsed = schema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { name, currentSlug } = parsed.data
  const existing = await prisma.tripStatus.findUnique({ where: { name } })
  if (existing) return { error: "Ya existe un estado con ese nombre" }

  try {
    await prisma.tripStatus.create({ data: { name } })
    revalidatePath("/estados-viaje")
    return { success: true }
  } catch {
    return { error: "Error al crear el estado" }
  }
}

export async function updateTripStatus(id: string, data: unknown) {
  const parsed = schema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { name, currentSlug } = parsed.data
  const existing = await prisma.tripStatus.findUnique({ where: { name } })
  if (existing && existing.id !== id) return { error: "Ya existe un estado con ese nombre" }

  try {
    await prisma.tripStatus.update({ where: { id }, data: { name } })
    revalidatePath("/estados-viaje")
    return { success: true }
  } catch {
    return { error: "Error al actualizar el estado" }
  }
}

export async function deleteTripStatus(id: string, currentSlug: string) {
  const status = await prisma.tripStatus.findUnique({
    where: { id },
    include: { _count: { select: { trips: true } } },
  })
  if (!status) return { error: "Estado no encontrado" }
  if (status._count.trips > 0) {
    return { error: `No se puede eliminar: ${status._count.trips} viaje(s) usan este estado` }
  }

  try {
    await prisma.tripStatus.delete({ where: { id } })
    revalidatePath("/estados-viaje")
    return { success: true }
  } catch {
    return { error: "Error al eliminar el estado" }
  }
}
