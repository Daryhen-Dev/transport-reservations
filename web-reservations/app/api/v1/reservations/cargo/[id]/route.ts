import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireBranchAccess } from "@/lib/api/auth";

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const authOrError = await requireAuth(req);
  if (authOrError instanceof NextResponse) return authOrError;

  const { id } = await ctx.params;

  const reservation = await prisma.cargoReservation.findUnique({
    where: { id },
    include: {
      reservationStatus: { select: { name: true } },
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

  if (reservation.reservationStatus.name !== "PENDIENTE") {
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message: "Solo se pueden eliminar reservas en estado PENDIENTE",
        },
      },
      { status: 409 }
    );
  }

  try {
    await prisma.cargoReservation.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message: "Error al eliminar la reserva de encomienda",
        },
      },
      { status: 409 }
    );
  }
}
