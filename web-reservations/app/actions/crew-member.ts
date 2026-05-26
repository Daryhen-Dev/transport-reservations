"use server"

import { z } from "zod"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

const crewMemberSchema = z.object({
  firstName: z.string().min(1, "El nombre es requerido"),
  lastName: z.string().min(1, "El apellido es requerido"),
  documentTypeId: z.string().min(1, "El tipo de documento es requerido"),
  documentNumber: z.string().min(1, "El número de documento es requerido"),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
  currentSlug: z.string(),
})

export async function createCrewMember(data: unknown) {
  const parsed = crewMemberSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { firstName, lastName, documentTypeId, documentNumber, phone, birthDate, currentSlug } = parsed.data

  const existing = await prisma.crewMember.findUnique({
    where: { documentTypeId_documentNumber: { documentTypeId, documentNumber } },
  })
  if (existing) return { error: "Ya existe un tripulante con ese documento" }

  try {
    const created = await prisma.crewMember.create({
      data: {
        firstName,
        lastName,
        documentTypeId,
        documentNumber,
        phone: phone || null,
        birthDate: birthDate ? new Date(birthDate) : null,
      },
    })
    revalidatePath(`/${currentSlug}/tripulacion`)
    return { success: true, id: created.id }
  } catch {
    return { error: "Error al crear el tripulante" }
  }
}

export async function updateCrewMember(id: string, data: unknown) {
  const parsed = crewMemberSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { firstName, lastName, documentTypeId, documentNumber, phone, birthDate, currentSlug } = parsed.data

  const existing = await prisma.crewMember.findUnique({
    where: { documentTypeId_documentNumber: { documentTypeId, documentNumber } },
  })
  if (existing && existing.id !== id) return { error: "Ya existe un tripulante con ese documento" }

  try {
    await prisma.crewMember.update({
      where: { id },
      data: {
        firstName,
        lastName,
        documentTypeId,
        documentNumber,
        phone: phone || null,
        birthDate: birthDate ? new Date(birthDate) : null,
      },
    })
    revalidatePath(`/${currentSlug}/tripulacion`)
    return { success: true }
  } catch {
    return { error: "Error al actualizar el tripulante" }
  }
}

export async function deleteCrewMember(id: string, currentSlug: string) {
  const member = await prisma.crewMember.findUnique({
    where: { id },
    include: { _count: { select: { trips: true } } },
  })

  if (!member) return { error: "Tripulante no encontrado" }
  if (member._count.trips > 0) {
    return { error: "No se puede eliminar un tripulante asignado a viajes" }
  }

  try {
    await prisma.crewMember.delete({ where: { id } })
    revalidatePath(`/${currentSlug}/tripulacion`)
    return { success: true }
  } catch {
    return { error: "Error al eliminar el tripulante" }
  }
}
