import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { startOfDay, endOfDay } from "date-fns";
import { prisma } from "@/lib/db";
import { requireAuth, requireBranchAccess } from "@/lib/api/auth";
import { auditCreate } from "@/lib/api/audit";
import { createQuickTransferredReservationSchema } from "@/lib/api/schemas/passenger-reservations";
import { PRICE_NORMAL, transferBreakdown } from "@/lib/pricing";

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

export async function POST(req: NextRequest) {
  const authOrError = await requireAuth(req);
  if (authOrError instanceof NextResponse) return authOrError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON" } },
      { status: 400 }
    );
  }

  const parsed = createQuickTransferredReservationSchema.safeParse(body);
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

  const {
    scheduleId,
    date,
    branchId,
    proveedorId,
    transferredToAgencyId,
    seatCount,
    passengers,
  } = parsed.data;

  if (passengers.length !== seatCount) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: `Debe registrar exactamente ${seatCount} pasajero(s); recibí ${passengers.length}`,
        },
      },
      { status: 400 }
    );
  }

  const gate = await requireBranchAccess(req, branchId);
  if (gate instanceof NextResponse) return gate;

  const schedule = await prisma.tripSchedule.findUnique({
    where: { id: scheduleId },
    select: { id: true, time: true, routeId: true },
  });
  if (!schedule) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Horario no encontrado" } },
      { status: 404 }
    );
  }

  // El proveedor (comprador) debe ser PERSONA o INSTITUCION_PUBLICA.
  // El destino debe ser AGENCIA.
  const [buyer, destination] = await Promise.all([
    prisma.proveedor.findUnique({
      where: { id: proveedorId },
      select: { proveedorType: { select: { name: true } } },
    }),
    prisma.proveedor.findUnique({
      where: { id: transferredToAgencyId },
      select: { proveedorType: { select: { name: true } } },
    }),
  ]);
  if (!buyer) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Proveedor no encontrado" } },
      { status: 404 }
    );
  }
  if (!destination) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Agencia destino no encontrada" } },
      { status: 404 }
    );
  }
  if (buyer.proveedorType.name === "AGENCIA") {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message:
            "El comprador no puede ser tipo AGENCIA en una transferencia. Usá PERSONA o INSTITUCION_PUBLICA.",
        },
      },
      { status: 400 }
    );
  }
  if (destination.proveedorType.name !== "AGENCIA") {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "La agencia destino debe ser tipo AGENCIA",
        },
      },
      { status: 400 }
    );
  }

  // Precio fijo NORMAL ($30), comision retenida $5/pax via transferBreakdown.
  const priceAmount = PRICE_NORMAL;
  const { amountToAgency, commissionEarned } = transferBreakdown(priceAmount, seatCount);

  const departureDay = new Date(date + "T00:00:00");
  const start = startOfDay(departureDay);
  const end = endOfDay(departureDay);

  let trip = await prisma.trip.findFirst({
    where: {
      scheduleId,
      branchId,
      departureAt: { gte: start, lte: end },
    },
    include: { status: true },
  });

  if (!trip) {
    const [hours, minutes] = schedule.time.split(":").map(Number);
    const departureAt = new Date(departureDay);
    departureAt.setHours(hours, minutes, 0, 0);
    const abiertoStatus = await prisma.tripStatus.findUnique({
      where: { name: "ABIERTO" },
      select: { id: true },
    });
    if (!abiertoStatus) {
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL",
            message: "Estado ABIERTO no encontrado. Ejecute el seed.",
          },
        },
        { status: 500 }
      );
    }
    trip = await prisma.trip.create({
      data: {
        departureAt,
        routeId: schedule.routeId,
        branchId,
        scheduleId,
        statusId: abiertoStatus.id,
      },
      include: { status: true },
    });
  } else if (trip.status.name === "CERRADO") {
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message: "Este viaje está cerrado y no acepta nuevas reservas",
        },
      },
      { status: 409 }
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

  try {
    const created = await prisma.$transaction(async (tx) => {
      const reservation = await tx.passengerReservation.create({
        data: {
          tripId: trip!.id,
          proveedorId,
          seatCount,
          priceType: "NORMAL",
          priceAmount,
          commissionAmount: null,
          transferredToAgencyId,
          transferAmountToAgency: amountToAgency,
          transferCommissionAmount: commissionEarned,
          reservationStatusId: transferidaStatus.id,
          ...auditCreate(authOrError.userId),
        },
      });

      // Upsert + link de pasajeros. Idéntico al patrón del full-create.
      for (const c of passengers) {
        const p = await tx.passenger.upsert({
          where: {
            documentTypeId_documentNumber: {
              documentTypeId: c.documentTypeId,
              documentNumber: c.documentNumber,
            },
          },
          create: {
            firstName: c.firstName,
            lastName: c.lastName,
            documentTypeId: c.documentTypeId,
            documentNumber: c.documentNumber,
            countryId: c.countryId,
            birthDate: c.birthDate ? new Date(c.birthDate) : undefined,
          },
          update: {},
        });
        const alreadyLinked = await tx.reservationPassenger.findUnique({
          where: {
            reservationId_passengerId: {
              reservationId: reservation.id,
              passengerId: p.id,
            },
          },
        });
        if (!alreadyLinked) {
          await tx.reservationPassenger.create({
            data: { reservationId: reservation.id, passengerId: p.id },
          });
        }
      }

      return tx.passengerReservation.findUniqueOrThrow({
        where: { id: reservation.id },
        include: RESERVATION_INCLUDE,
      });
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Error al crear la reserva transferida",
        },
      },
      { status: 400 }
    );
  }
}
