import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireBranchAccess } from "@/lib/api/auth";
import { addPassengerSchema } from "@/lib/api/schemas/passenger-reservations";

const PASSENGER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  documentType: { select: { id: true, name: true } },
  documentNumber: true,
  country: { select: { id: true, name: true } },
  birthDate: true,
} as const;

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const authOrError = await requireAuth(req);
  if (authOrError instanceof NextResponse) return authOrError;

  const { id: reservationId } = await ctx.params;

  const reservation = await prisma.passengerReservation.findUnique({
    where: { id: reservationId },
    select: { trip: { select: { branchId: true } } },
  });
  if (!reservation) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Reserva no encontrada" } },
      { status: 404 }
    );
  }

  const gate = await requireBranchAccess(req, reservation.trip.branchId);
  if (gate instanceof NextResponse) return gate;

  const links = await prisma.reservationPassenger.findMany({
    where: { reservationId },
    include: { passenger: { select: PASSENGER_SELECT } },
    orderBy: { passenger: { createdAt: "asc" } },
  });
  return NextResponse.json({ data: links.map((rp) => rp.passenger) });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const authOrError = await requireAuth(req);
  if (authOrError instanceof NextResponse) return authOrError;

  const { id: reservationId } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON" } },
      { status: 400 }
    );
  }

  const parsed = addPassengerSchema.safeParse(body);
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

  const reservation = await prisma.passengerReservation.findUnique({
    where: { id: reservationId },
    select: {
      id: true,
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

  if (parsed.data.mode === "link") {
    const { passengerId } = parsed.data;
    const existing = await prisma.reservationPassenger.findUnique({
      where: {
        reservationId_passengerId: { reservationId, passengerId },
      },
    });
    if (existing) {
      return NextResponse.json(
        {
          error: {
            code: "CONFLICT",
            message: "El pasajero ya está en esta reserva",
          },
        },
        { status: 409 }
      );
    }
    try {
      await prisma.reservationPassenger.create({
        data: { reservationId, passengerId },
      });
      const passenger = await prisma.passenger.findUnique({
        where: { id: passengerId },
        select: PASSENGER_SELECT,
      });
      if (!passenger) {
        return NextResponse.json(
          {
            error: {
              code: "NOT_FOUND",
              message: "Pasajero no encontrado",
            },
          },
          { status: 404 }
        );
      }
      return NextResponse.json({ data: passenger }, { status: 201 });
    } catch {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "Error al agregar el pasajero a la reserva",
          },
        },
        { status: 400 }
      );
    }
  }

  // mode === "create": create a Passenger AND link it.
  const { passenger } = parsed.data;
  const duplicate = await prisma.passenger.findUnique({
    where: {
      documentTypeId_documentNumber: {
        documentTypeId: passenger.documentTypeId,
        documentNumber: passenger.documentNumber,
      },
    },
  });
  if (duplicate) {
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message: `Ya existe un pasajero con ese tipo y número de documento (${passenger.documentNumber})`,
        },
      },
      { status: 409 }
    );
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const newPassenger = await tx.passenger.create({
        data: {
          firstName: passenger.firstName,
          lastName: passenger.lastName,
          documentTypeId: passenger.documentTypeId,
          documentNumber: passenger.documentNumber,
          countryId: passenger.countryId,
          phone: passenger.phone ?? null,
          birthDate: passenger.birthDate
            ? new Date(passenger.birthDate)
            : undefined,
        },
        select: PASSENGER_SELECT,
      });
      await tx.reservationPassenger.create({
        data: { reservationId, passengerId: newPassenger.id },
      });
      return newPassenger;
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Error al crear el pasajero",
        },
      },
      { status: 400 }
    );
  }
}
