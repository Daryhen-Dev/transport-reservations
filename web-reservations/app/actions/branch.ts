"use server"

import { z } from "zod"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

const branchSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  slug: z
    .string()
    .min(2, "El slug debe tener al menos 2 caracteres")
    .regex(/^[a-z0-9-]+$/, "Solo letras minúsculas, números y guiones"),
  currentSlug: z.string(),
})

export async function createBranch(data: unknown) {
  const parsed = branchSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }
  const { name, slug, currentSlug } = parsed.data

  const existing = await prisma.branch.findUnique({ where: { slug } })
  if (existing) return { error: "El slug ya está en uso" }

  try {
    await prisma.branch.create({
      data: { name, slug, agencyId: "agency_main" },
    })
    revalidatePath(`/${currentSlug}/sucursales`)
    return { success: true }
  } catch {
    return { error: "Error al crear la sucursal" }
  }
}
