"use server"

import { z } from "zod"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import type { Proveedor, ProveedorType, DocumentType } from "@/lib/generated/prisma/client"

export type ProveedorWithRelations = Proveedor & {
  proveedorType: ProveedorType
  documentType: DocumentType | null
}

const personaSchema = z.object({
  proveedorTypeId: z.string().min(1, "Tipo de proveedor requerido"),
  firstName: z.string().min(1, "Nombre requerido"),
  lastName: z.string().min(1, "Apellido requerido"),
  documentTypeId: z.string().min(1, "Tipo de documento requerido"),
  documentNumber: z.string().min(1, "Número de documento requerido"),
  phone: z.string().optional(),
  currentSlug: z.string(),
})

const empresaSchema = z.object({
  proveedorTypeId: z.string().min(1, "Tipo de proveedor requerido"),
  companyName: z.string().min(1, "Nombre de empresa requerido"),
  documentTypeId: z.string().min(1, "Tipo de documento requerido"),
  documentNumber: z.string().min(1, "Número de documento requerido"),
  phone: z.string().optional(),
  currentSlug: z.string(),
})

function revalidate(slug: string) {
  revalidatePath(`/${slug}/proveedores`)
}

async function resolveTypeName(proveedorTypeId: string): Promise<string | null> {
  const type = await prisma.proveedorType.findUnique({ where: { id: proveedorTypeId } })
  return type?.name ?? null
}

export async function createProveedor(data: unknown): Promise<{ success?: true; proveedor?: ProveedorWithRelations; error?: string }> {
  const raw = data as Record<string, unknown>
  const proveedorTypeId = typeof raw?.proveedorTypeId === "string" ? raw.proveedorTypeId : ""
  const typeName = await resolveTypeName(proveedorTypeId)

  if (!typeName) return { error: "Tipo de proveedor inválido" }

  const isPersona = typeName.toLowerCase().includes("persona")

  if (isPersona) {
    const parsed = personaSchema.safeParse(data)
    if (!parsed.success) return { error: parsed.error.issues[0].message }

    const { proveedorTypeId: ctId, firstName, lastName, documentTypeId, documentNumber, phone, currentSlug } = parsed.data

    const existing = await prisma.proveedor.findFirst({
      where: { proveedorTypeId: ctId, documentTypeId, documentNumber },
    })
    if (existing) return { error: "Ya existe un proveedor con ese documento" }

    try {
      const created = await prisma.proveedor.create({
        data: { proveedorTypeId: ctId, firstName, lastName, documentTypeId, documentNumber, phone: phone ?? null },
        include: { proveedorType: true, documentType: true },
      })
      revalidate(currentSlug)
      return { success: true, proveedor: created }
    } catch {
      return { error: "Error al crear el proveedor" }
    }
  } else {
    const parsed = empresaSchema.safeParse(data)
    if (!parsed.success) return { error: parsed.error.issues[0].message }

    const { proveedorTypeId: ctId, companyName, documentTypeId, documentNumber, phone, currentSlug } = parsed.data

    const existing = await prisma.proveedor.findFirst({
      where: { proveedorTypeId: ctId, documentTypeId, documentNumber },
    })
    if (existing) return { error: "Ya existe un proveedor con ese documento" }

    try {
      const created = await prisma.proveedor.create({
        data: { proveedorTypeId: ctId, companyName, documentTypeId, documentNumber, phone: phone ?? null },
        include: { proveedorType: true, documentType: true },
      })
      revalidate(currentSlug)
      return { success: true, proveedor: created }
    } catch {
      return { error: "Error al crear el proveedor" }
    }
  }
}

export async function updateProveedor(id: string, data: unknown): Promise<{ success?: true; error?: string }> {
  const raw = data as Record<string, unknown>
  const proveedorTypeId = typeof raw?.proveedorTypeId === "string" ? raw.proveedorTypeId : ""
  const typeName = await resolveTypeName(proveedorTypeId)

  if (!typeName) return { error: "Tipo de proveedor inválido" }

  const isPersona = typeName.toLowerCase().includes("persona")

  if (isPersona) {
    const parsed = personaSchema.safeParse(data)
    if (!parsed.success) return { error: parsed.error.issues[0].message }

    const { proveedorTypeId: ctId, firstName, lastName, documentTypeId, documentNumber, phone, currentSlug } = parsed.data

    const existing = await prisma.proveedor.findFirst({
      where: { proveedorTypeId: ctId, documentTypeId, documentNumber, NOT: { id } },
    })
    if (existing) return { error: "Ya existe un proveedor con ese documento" }

    try {
      await prisma.proveedor.update({
        where: { id },
        data: { firstName, lastName, documentTypeId, documentNumber, phone: phone ?? null },
      })
      revalidate(currentSlug)
      return { success: true }
    } catch {
      return { error: "Error al actualizar el proveedor" }
    }
  } else {
    const parsed = empresaSchema.safeParse(data)
    if (!parsed.success) return { error: parsed.error.issues[0].message }

    const { proveedorTypeId: ctId, companyName, documentTypeId, documentNumber, phone, currentSlug } = parsed.data

    const existing = await prisma.proveedor.findFirst({
      where: { proveedorTypeId: ctId, documentTypeId, documentNumber, NOT: { id } },
    })
    if (existing) return { error: "Ya existe un proveedor con ese documento" }

    try {
      await prisma.proveedor.update({
        where: { id },
        data: { companyName, documentTypeId, documentNumber, phone: phone ?? null },
      })
      revalidate(currentSlug)
      return { success: true }
    } catch {
      return { error: "Error al actualizar el proveedor" }
    }
  }
}

export async function deleteProveedor(id: string, currentSlug: string): Promise<{ success?: true; error?: string }> {
  const passengerCount = await prisma.passengerReservation.count({ where: { proveedorId: id } })
  const cargoCount = await prisma.cargoReservation.count({ where: { proveedorId: id } })

  if (passengerCount > 0 || cargoCount > 0) {
    return { error: "No se puede eliminar: el proveedor tiene reservas asociadas" }
  }

  try {
    await prisma.proveedor.delete({ where: { id } })
    revalidatePath(`/${currentSlug}/proveedores`)
    return { success: true }
  } catch {
    return { error: "Error al eliminar el proveedor" }
  }
}
