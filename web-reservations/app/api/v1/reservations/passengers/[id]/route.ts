import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireBranchAccess } from "@/lib/api/auth";
import { updatePassengerReservationSchema } from "@/lib/api/schemas/passenger-reservations";

const RESERVATION_DETAIL_INCLUDE = {
  trip: {
    include: {
      route: { select: { id: true, origin: true, destination: true } },
      branch: { select: { id: true, name: true } },
      status: { select: { id: true, name: true } },
    },
  },
  proveedor: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      companyName: true,
      proveedorTypeId: true,
      phone: true,
    },
  },
  reservationStatus: { select: { id: true, name: true } },
  passengers: {
    include: {
      passenger: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          documentType: { select: { id: true, name: true } },
          documentNumber: true,
          country: { select: { id: true, name: true } },
          birthDate: true,
        },
      },
    },
    orderBy: { passenger: { createdAt: "asc" } },
  },
  _count: { select: { passengers: true } },
} as const;

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const authOrError = await requireAuth(req);
  if (authOrError instanceof NextResponse) return authOrError;

  const { id } = await ctx.params;
  const reservation = await prisma.passengerReservation.findUnique({
    where: { id },
    include: RESERVATION_DETAIL_INCLUDE,
  });
  if (!reservation) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Reserva no encontrada" } },
      { status: 404 }
    );
  }

  const gate = await requireBranchAccess(req, reservation.trip.branchId);
  if (gate instanceof NextResponse) return gate;

  return NextResponse.json({ data: reservation });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const authOrError = await requireAuth(req);
  if (authOrError instanceof NextResponse) return authOrError;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON" } },
      { status: 400 }
    );
  }

  const parsed = updatePassengerReservationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: parsed.error.issues[0]?.message ?? "Invalid body",
        },
      },
      { status: 400 }
    );
  }

  const existing = await prisma.passengerReservation.findUnique({
    where: { id },
    include: {
      trip: { select: { branchId: true, status: { select: { name: true } } } },
    },
  });
  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Reserva no encontrada" } },
      { status: 404 }
    );
  }

  const gate = await requireBranchAccess(req, existing.trip.branchId);
  if (gate instanceof NextResponse) return gate;

  if (existing.trip.status.name === "CERRADO") {
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

  const { seatCount, tripId } = parsed.data;

  // If switching the reservation to a different trip, validate access to the
  // target trip's branch as well.
  if (tripId && tripId !== existing.trip.branchId) {
    const targetTrip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { status: { select: { name: true } } },
    });
    if (!targetTrip) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Viaje destino inválido" } },
        { status: 400 }
      );
    }
    const targetGate = await requireBranchAccess(req, targetTrip.branchId);
    if (targetGate instanceof NextResponse) return targetGate;
    if (targetTrip.status.name === "CERRADO") {
      return NextResponse.json(
        {
          error: {
            code: "CONFLICT",
            message: "El viaje destino está cerrado",
          },
        },
        { status: 409 }
      );
    }
  }

  try {
    const updated = await prisma.passengerReservation.update({
      where: { id },
      data: {
        seatCount,
        tripId,
      },
      include: RESERVATION_DETAIL_INCLUDE,
    });
    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Error al actualizar la reserva",
        },
      },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const authOrError = await requireAuth(req);
  if (authOrError instanceof NextResponse) return authOrError;

  const { id } = await ctx.params;

  const existing = await prisma.passengerReservation.findUnique({
    where: { id },
    include: {
      reservationStatus: { select: { name: true } },
      trip: { select: { branchId: true, status: { select: { name: true } } } },
    },
  });
  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Reserva no encontrada" } },
      { status: 404 }
    );
  }

  const gate = await requireBranchAccess(req, existing.trip.branchId);
  if (gate instanceof NextResponse) return gate;

  if (existing.trip.status.name === "CERRADO") {
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

  if (existing.reservationStatus.name !== "PENDIENTE") {
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
    // ReservationPassenger rows are deleted via onDelete: Cascade.
    await prisma.passengerReservation.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch {
    return NextResponse.json(
      {
        error: { code: "CONFLICT", message: "Error al eliminar la reserva" },
      },
      { status: 409 }
    );
  }
}
