"use server"

import { z } from "zod"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

const routeSchema = z.object({
  origin: z.string().min(2, "El origen debe tener al menos 2 caracteres"),
  destination: z.string().min(2, "El destino debe tener al menos 2 caracteres"),
  branchId: z.string().min(1, "Debe seleccionar una sucursal"),
  currentSlug: z.string(),
})

function revalidate(slug: string) {
  revalidatePath(`/${slug}/rutas`)
}

export async function createRoute(data: unknown) {
  const parsed = routeSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { origin, destination, branchId, currentSlug } = parsed.data

  try {
    await prisma.route.create({ data: { origin, destination, branchId } })
    revalidate(currentSlug)
    return { success: true }
  } catch {
    return { error: "Error al crear la ruta" }
  }
}

export async function updateRoute(id: string, data: unknown) {
  const parsed = routeSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { origin, destination, branchId, currentSlug } = parsed.data

  try {
    await prisma.route.update({ where: { id }, data: { origin, destination, branchId } })
    revalidate(currentSlug)
    return { success: true }
  } catch {
    return { error: "Error al actualizar la ruta" }
  }
}

export async function deleteRoute(id: string, currentSlug: string) {
  try {
    await prisma.route.delete({ where: { id } })
    revalidatePath(`/${currentSlug}/rutas`)
    return { success: true }
  } catch {
    return { error: "Error al eliminar la ruta. Puede que tenga viajes asociados." }
  }
}
