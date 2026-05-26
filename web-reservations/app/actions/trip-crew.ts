"use server"

import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function assignCrewMember(
  tripId: string,
  crewMemberId: string,
  crewRoleId: string,
  currentSlug: string
) {
  // Check role isn't already taken by someone else
  const existing = await prisma.tripCrew.findUnique({
    where: { tripId_crewRoleId: { tripId, crewRoleId } },
  })
  if (existing && existing.crewMemberId !== crewMemberId) {
    return { error: "Ese rol ya está asignado a otro tripulante en este viaje" }
  }

  // Check this person isn't already on this trip with another role
  const existingMember = await prisma.tripCrew.findUnique({
    where: { tripId_crewMemberId: { tripId, crewMemberId } },
  })
  if (existingMember && existingMember.crewRoleId !== crewRoleId) {
    return { error: "Este tripulante ya está asignado a este viaje con otro rol" }
  }

  try {
    await prisma.tripCrew.upsert({
      where: { tripId_crewMemberId: { tripId, crewMemberId } },
      update: { crewRoleId },
      create: { tripId, crewMemberId, crewRoleId },
    })

    // Check if all roles are now assigned
    const totalRoles = await prisma.crewRole.count()
    const assignedRoles = await prisma.tripCrew.count({ where: { tripId } })
    const allCrewAssigned = assignedRoles >= totalRoles

    revalidatePath(`/${currentSlug}/viajes`)
    return { success: true, allCrewAssigned }
  } catch {
    return { error: "Error al asignar tripulante" }
  }
}

export async function removeCrewMember(
  tripId: string,
  crewMemberId: string,
  currentSlug: string
) {
  try {
    await prisma.tripCrew.delete({
      where: { tripId_crewMemberId: { tripId, crewMemberId } },
    })
    revalidatePath(`/${currentSlug}/viajes`)
    return { success: true }
  } catch {
    return { error: "Error al quitar tripulante" }
  }
}
