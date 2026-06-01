import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { startOfDay, endOfDay } from "date-fns";
import { prisma } from "@/lib/db";
import { requireAuth, requireBranchAccess } from "@/lib/api/auth";
import { auditCreate } from "@/lib/api/audit";
import { createQuickPassengerReservationSchema } from "@/lib/api/schemas/passenger-reservations";

const RESERVATION_INCLUDE = {
  trip: {
    include: {
      route: {
        select: {
          id: true,
          origin: true,
          destination: true,
          directPriceAmount: true,
          incomingAgencyPriceAmount: true,
          outgoingCommissionAmount: true,
          minPrice: true,
        },
      },
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
  externalAgency: {
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

  const parsed = createQuickPassengerReservationSchema.safeParse(body);
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
    seatCount,
    isPending,
    priceAmount,
    salesChannel: salesChannelInput,
    externalAgencyId: externalAgencyIdInput,
  } = parsed.data;

  const salesChannel = salesChannelInput ?? "DIRECT";
  const externalAgencyId =
    salesChannel === "DIRECT" ? null : externalAgencyIdInput ?? null;

  if (salesChannel !== "DIRECT" && !externalAgencyId) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Debe seleccionar la agencia externa para este canal",
        },
      },
      { status: 400 }
    );
  }

  const gate = await requireBranchAccess(req, branchId);
  if (gate instanceof NextResponse) return gate;

  const schedule = await prisma.tripSchedule.findUnique({
    where: { id: scheduleId },
    select: {
      id: true,
      time: true,
      routeId: true,
      route: {
        select: {
          directPriceAmount: true,
          incomingAgencyPriceAmount: true,
          outgoingCommissionAmount: true,
          minPrice: true,
        },
      },
    },
  });
  if (!schedule) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Horario no encontrado" } },
      { status: 404 }
    );
  }

  if (externalAgencyId) {
    const agency = await prisma.proveedor.findUnique({
      where: { id: externalAgencyId },
      include: { proveedorType: { select: { name: true } } },
    });
    if (!agency || agency.proveedorType.name !== "AGENCIA") {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "La agencia externa debe ser un proveedor tipo AGENCIA",
          },
        },
        { status: 400 }
      );
    }
  }

  const minPrice = Number(schedule.route.minPrice);
  if (priceAmount < minPrice) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: `El precio no puede ser menor al mínimo ($${minPrice.toFixed(2)})`,
        },
      },
      { status: 400 }
    );
  }

  const suggestedAmount =
    salesChannel === "FROM_AGENCY"
      ? Number(schedule.route.incomingAgencyPriceAmount)
      : Number(schedule.route.directPriceAmount);

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

  const statusName = isPending ? "PENDIENTE" : "CONFIRMADA";
  const reservationStatus = await prisma.reservationStatus.findFirst({
    where: { name: { contains: statusName, mode: "insensitive" } },
    select: { id: true },
  });
  if (!reservationStatus) {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL",
          message: `Estado ${statusName} no configurado`,
        },
      },
      { status: 500 }
    );
  }

  try {
    const created = await prisma.passengerReservation.create({
      data: {
        tripId: trip.id,
        proveedorId,
        seatCount,
        priceAmount,
        suggestedAmount,
        salesChannel,
        externalAgencyId,
        reservationStatusId: reservationStatus.id,
        ...auditCreate(authOrError.userId),
      },
      include: RESERVATION_INCLUDE,
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Error al crear la reserva",
        },
      },
      { status: 400 }
    );
  }
}
