"use server"

import { z } from "zod"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

const countrySchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  nationality: z.string().min(2, "La nacionalidad debe tener al menos 2 caracteres"),
  code: z
    .string()
    .length(2, "El código debe tener exactamente 2 letras")
    .regex(/^[A-Z]{2}$/, "Solo letras mayúsculas (ej: VE, CO)")
    .optional()
    .or(z.literal("")),
  currentSlug: z.string(),
})

function revalidate(slug: string) {
  revalidatePath(`/${slug}/paises`)
}

export async function createCountry(data: unknown) {
  const parsed = countrySchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { name, nationality, code, currentSlug } = parsed.data
  const normalizedCode = code || undefined

  const existingName = await prisma.country.findUnique({ where: { name } })
  if (existingName) return { error: "Ya existe un país con ese nombre" }

  if (normalizedCode) {
    const existingCode = await prisma.country.findUnique({ where: { code: normalizedCode } })
    if (existingCode) return { error: "Ya existe un país con ese código" }
  }

  try {
    await prisma.country.create({ data: { name, nationality, code: normalizedCode } })
    revalidate(currentSlug)
    return { success: true }
  } catch {
    return { error: "Error al crear el país" }
  }
}

export async function updateCountry(id: string, data: unknown) {
  const parsed = countrySchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { name, nationality, code, currentSlug } = parsed.data
  const normalizedCode = code || undefined

  const existingName = await prisma.country.findFirst({ where: { name, NOT: { id } } })
  if (existingName) return { error: "Ya existe un país con ese nombre" }

  if (normalizedCode) {
    const existingCode = await prisma.country.findFirst({ where: { code: normalizedCode, NOT: { id } } })
    if (existingCode) return { error: "Ya existe un país con ese código" }
  }

  try {
    await prisma.country.update({ where: { id }, data: { name, nationality, code: normalizedCode } })
    revalidate(currentSlug)
    return { success: true }
  } catch {
    return { error: "Error al actualizar el país" }
  }
}

export async function deleteCountry(id: string, currentSlug: string) {
  try {
    await prisma.country.delete({ where: { id } })
    revalidatePath(`/${currentSlug}/paises`)
    return { success: true }
  } catch {
    return { error: "Error al eliminar el país. Puede que tenga datos asociados." }
  }
}
