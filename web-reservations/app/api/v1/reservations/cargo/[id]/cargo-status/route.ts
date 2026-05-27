import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireBranchAccess } from "@/lib/api/auth";
import { updateCargoStatusSchema } from "@/lib/api/schemas/cargo-reservations";

const CARGO_INCLUDE = {
  trip: {
    include: {
      route: { select: { id: true, origin: true, destination: true } },
      branch: { select: { id: true, name: true } },
      manifest: { select: { code: true } },
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
    },
  },
  reservationStatus: { select: { id: true, name: true } },
  cargoStatus: { select: { id: true, name: true } },
  destinationBranch: { select: { id: true, name: true } },
  categoria: { select: { id: true, name: true } },
  destinatario: {
    select: { id: true, firstName: true, lastName: true, phone: true },
  },
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

  const parsed = updateCargoStatusSchema.safeParse(body);
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

  const existing = await prisma.cargoReservation.findUnique({
    where: { id },
    include: {
      trip: {
        select: {
          branchId: true,
          status: { select: { name: true } },
        },
      },
      destinationBranch: { select: { id: true } },
    },
  });
  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Reserva no encontrada" } },
      { status: 404 }
    );
  }

  // Cargo-status is normally updated by the DESTINATION branch (when the
  // package arrives) — fall back to the origin branch when no destination is
  // set. Either branch may pass the access gate.
  const destinationBranchId = existing.destinationBranch?.id;
  const branchForGate = destinationBranchId ?? existing.trip.branchId;
  const gate = await requireBranchAccess(req, branchForGate);
  if (gate instanceof NextResponse) return gate;

  if (existing.trip.status.name === "CERRADO") {
    // Cargo status updates are allowed on closed trips (in-transit/delivered
    // happen after the trip closes), so do NOT gate by trip status here.
  }

  try {
    const updated = await prisma.cargoReservation.update({
      where: { id },
      data: { cargoStatusId: parsed.data.cargoStatusId },
      include: CARGO_INCLUDE,
    });
    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Error al actualizar el estado de la encomienda",
        },
      },
      { status: 400 }
    );
  }
}
