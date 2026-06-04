import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth, requireBranchAccess } from "@/lib/api/auth";
import { auditUpdate } from "@/lib/api/audit";
import { cuidSchema } from "@/lib/api/schemas/cuid";
import { transferBreakdown } from "@/lib/pricing";

const transferSchema = z.object({
  agencyId: cuidSchema,
});

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
  transferredToAgency: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      companyName: true,
    },
  },
  reservationStatus: { select: { id: true, name: true } },
  _count: { select: { passengers: true } },
} as const;

export async function POST(
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

  const parsed = transferSchema.safeParse(body);
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

  const { agencyId } = parsed.data;

  const existing = await prisma.passengerReservation.findUnique({
    where: { id },
    include: {
      trip: { select: { branchId: true, status: { select: { name: true } } } },
      reservationStatus: { select: { name: true } },
      proveedor: { select: { proveedorType: { select: { name: true } } } },
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
          message: "El viaje está cerrado, no se puede transferir",
        },
      },
      { status: 409 }
    );
  }

  // Las reservas con proveedor AGENCIA no se transfieren — generaria cruces
  // de comisiones extranas (REFERIDOS + TRANSFERIDA al mismo tiempo).
  if (existing.proveedor.proveedorType.name === "AGENCIA") {
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message:
            "No se pueden transferir reservas con proveedor AGENCIA. Solo PERSONA o INSTITUCION_PUBLICA.",
        },
      },
      { status: 409 }
    );
  }

  const currentStatus = existing.reservationStatus.name;
  if (currentStatus !== "PENDIENTE" && currentStatus !== "CONFIRMADA") {
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message: `Solo se pueden transferir reservas PENDIENTE o CONFIRMADA (actual: ${currentStatus})`,
        },
      },
      { status: 409 }
    );
  }

  const agency = await prisma.proveedor.findUnique({
    where: { id: agencyId },
    include: { proveedorType: { select: { name: true } } },
  });
  if (!agency) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Agencia no encontrada" } },
      { status: 404 }
    );
  }
  if (agency.proveedorType.name !== "AGENCIA") {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "El destinatario debe ser un proveedor tipo AGENCIA",
        },
      },
      { status: 400 }
    );
  }

  const transferidaStatus = await prisma.reservationStatus.findUnique({
    where: { name: "TRANSFERIDA" },
    select: { id: true },
  });
  if (!transferidaStatus) {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL",
          message: "Estado TRANSFERIDA no configurado. Ejecute el seed.",
        },
      },
      { status: 500 }
    );
  }

  const priceAmount = Number(existing.priceAmount.toString());
  const { amountToAgency, commissionEarned } = transferBreakdown(
    priceAmount,
    existing.seatCount
  );

  try {
    const updated = await prisma.passengerReservation.update({
      where: { id },
      data: {
        reservationStatusId: transferidaStatus.id,
        transferredToAgencyId: agencyId,
        transferAmountToAgency: amountToAgency,
        transferCommissionAmount: commissionEarned,
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
          message: "Error al transferir la reserva",
        },
      },
      { status: 400 }
    );
  }
}
