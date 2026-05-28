import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireBranchAccess } from "@/lib/api/auth";
import { updateReservationStatusSchema } from "@/lib/api/schemas/passenger-reservations";
import { auditUpdate } from "@/lib/api/audit";

const RESERVATION_INCLUDE = {
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
  _count: { select: { passengers: true } },
} as const;

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

  const parsed = updateReservationStatusSchema.safeParse(body);
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

  try {
    const updated = await prisma.passengerReservation.update({
      where: { id },
      data: {
        reservationStatusId: parsed.data.reservationStatusId,
        ...auditUpdate(authOrError.userId),
      },
      include: RESERVATION_INCLUDE,
    });
    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Error al actualizar el estado",
        },
      },
      { status: 400 }
    );
  }
}
