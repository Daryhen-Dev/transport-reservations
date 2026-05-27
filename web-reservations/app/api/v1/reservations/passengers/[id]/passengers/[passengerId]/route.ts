import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireBranchAccess } from "@/lib/api/auth";

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; passengerId: string }> }
) {
  const authOrError = await requireAuth(req);
  if (authOrError instanceof NextResponse) return authOrError;

  const { id: reservationId, passengerId } = await ctx.params;

  const reservation = await prisma.passengerReservation.findUnique({
    where: { id: reservationId },
    select: {
      trip: { select: { branchId: true, status: { select: { name: true } } } },
    },
  });
  if (!reservation) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Reserva no encontrada" } },
      { status: 404 }
    );
  }

  const gate = await requireBranchAccess(req, reservation.trip.branchId);
  if (gate instanceof NextResponse) return gate;

  if (reservation.trip.status.name === "CERRADO") {
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message: "Este viaje está cerrado y no acepta cambios",
        },
      },
      { status: 409 }
    );
  }

  const link = await prisma.reservationPassenger.findUnique({
    where: {
      reservationId_passengerId: { reservationId, passengerId },
    },
  });
  if (!link) {
    return NextResponse.json(
      {
        error: { code: "NOT_FOUND", message: "Pasajero no está en la reserva" },
      },
      { status: 404 }
    );
  }

  try {
    await prisma.reservationPassenger.delete({
      where: {
        reservationId_passengerId: { reservationId, passengerId },
      },
    });
    return new Response(null, { status: 204 });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message: "Error al eliminar el pasajero de la reserva",
        },
      },
      { status: 409 }
    );
  }
}
