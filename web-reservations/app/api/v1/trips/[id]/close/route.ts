import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireBranchAccess } from "@/lib/api/auth";
import { auditUpdate } from "@/lib/api/audit";

const TRIP_INCLUDE = {
  route: { select: { id: true, origin: true, destination: true, branchId: true } },
  branch: { select: { id: true, name: true, slug: true } },
  status: { select: { id: true, name: true } },
  schedule: {
    select: { id: true, routeId: true, time: true, isActive: true },
  },
  crew: {
    include: {
      crewMember: { select: { id: true, firstName: true, lastName: true } },
      crewRole: { select: { id: true, name: true } },
    },
  },
  manifest: { select: { id: true, code: true } },
} as const;

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const authOrError = await requireAuth(req);
  if (authOrError instanceof NextResponse) return authOrError;

  const { id } = await ctx.params;
  const existing = await prisma.trip.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Viaje no encontrado" } },
      { status: 404 }
    );
  }

  const gate = await requireBranchAccess(req, existing.branchId);
  if (gate instanceof NextResponse) return gate;

  // Pending reservations block closing.
  const [pendingPassengers, pendingCargo] = await Promise.all([
    prisma.passengerReservation.count({
      where: {
        tripId: id,
        reservationStatus: { name: { equals: "PENDIENTE", mode: "insensitive" } },
      },
    }),
    prisma.cargoReservation.count({
      where: {
        tripId: id,
        reservationStatus: { name: { equals: "PENDIENTE", mode: "insensitive" } },
      },
    }),
  ]);
  if (pendingPassengers > 0 || pendingCargo > 0) {
    const parts: string[] = [];
    if (pendingPassengers > 0)
      parts.push(`${pendingPassengers} reserva(s) de pasajeros`);
    if (pendingCargo > 0) parts.push(`${pendingCargo} encomienda(s)`);
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message: `No se puede cerrar el viaje: hay ${parts.join(" y ")} pendiente(s)`,
        },
      },
      { status: 409 }
    );
  }

  // Even non-pending reservations may have seats without a passenger linked.
  const reservationsForCheck = await prisma.passengerReservation.findMany({
    where: {
      tripId: id,
      NOT: { reservationStatus: { name: "CANCELADA" } },
    },
    select: {
      id: true,
      seatCount: true,
      _count: { select: { passengers: true } },
    },
  });
  const incompleteSeats = reservationsForCheck.reduce(
    (sum, r) => sum + Math.max(0, r.seatCount - r._count.passengers),
    0
  );
  if (incompleteSeats > 0) {
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message: `No se puede cerrar el viaje: hay ${incompleteSeats} asiento(s) reservado(s) sin pasajero asignado`,
        },
      },
      { status: 409 }
    );
  }

  const cerrado = await prisma.tripStatus.findUnique({
    where: { name: "CERRADO" },
    select: { id: true },
  });
  if (!cerrado) {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL",
          message: "Estado CERRADO no encontrado. Ejecute el seed.",
        },
      },
      { status: 500 }
    );
  }

  try {
    const updated = await prisma.trip.update({
      where: { id },
      data: { statusId: cerrado.id, ...auditUpdate(authOrError.userId) },
      include: TRIP_INCLUDE,
    });
    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Error al cerrar el viaje" } },
      { status: 400 }
    );
  }
}
