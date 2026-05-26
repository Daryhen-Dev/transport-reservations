import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function PATCH(req: NextRequest) {
  console.log("[api/cargo-status] PATCH received")
  try {
    const body = await req.json()
    console.log("[api/cargo-status] body", body)
    const { cargoReservationId, cargoStatusId } = body

    if (!cargoReservationId || !cargoStatusId) {
      console.log("[api/cargo-status] missing params")
      return NextResponse.json({ error: "Parámetros requeridos" }, { status: 400 })
    }

    console.log("[api/cargo-status] finding reservation...")
    const reservation = await prisma.cargoReservation.findUnique({
      where: { id: cargoReservationId },
      select: { id: true },
    })
    console.log("[api/cargo-status] reservation found:", reservation)
    if (!reservation) {
      return NextResponse.json({ error: "Encomienda no encontrada" }, { status: 404 })
    }

    console.log("[api/cargo-status] updating cargoStatusId to", cargoStatusId)
    await prisma.cargoReservation.update({
      where: { id: cargoReservationId },
      data: { cargoStatusId },
    })
    console.log("[api/cargo-status] update done, returning success")

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[api/cargo-status] error", err)
    return NextResponse.json({ error: "Error al actualizar el estado" }, { status: 500 })
  }
}
