import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { startOfDay, endOfDay } from "date-fns";
import { prisma } from "@/lib/db";
import { requireAuth, requireBranchAccess } from "@/lib/api/auth";
import { auditCreate } from "@/lib/api/audit";
import { createQuickPassengerReservationSchema } from "@/lib/api/schemas/passenger-reservations";
import {
  PRICE_LIBRE_MAX,
  PRICE_LIBRE_MIN,
  allowedPriceTypesForProveedor,
  commissionPerPaxForType,
  priceForType,
} from "@/lib/pricing";

const RESERVATION_INCLUDE = {
  trip: {
    include: {
      route: {
        select: { id: true, origin: true, destination: true },
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
    priceType,
    priceAmount: priceAmountInput,
  } = parsed.data;

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

  const buyer = await prisma.proveedor.findUnique({
    where: { id: proveedorId },
    select: { proveedorType: { select: { name: true } } },
  });
  if (!buyer) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Proveedor no encontrado" } },
      { status: 404 }
    );
  }

  const allowed = allowedPriceTypesForProveedor(buyer.proveedorType.name);
  if (!allowed.includes(priceType)) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: `El tipo de precio ${priceType} no aplica para proveedor ${buyer.proveedorType.name}`,
        },
      },
      { status: 400 }
    );
  }

  let priceAmount: number;
  if (priceType === "LIBRE") {
    if (priceAmountInput === undefined) {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "El precio es requerido para tipo LIBRE",
          },
        },
        { status: 400 }
      );
    }
    if (priceAmountInput < PRICE_LIBRE_MIN || priceAmountInput > PRICE_LIBRE_MAX) {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: `El precio LIBRE debe estar entre $${PRICE_LIBRE_MIN} y $${PRICE_LIBRE_MAX}`,
          },
        },
        { status: 400 }
      );
    }
    priceAmount = priceAmountInput;
  } else {
    const fixed = priceForType(priceType);
    if (fixed === null) {
      return NextResponse.json(
        { error: { code: "INTERNAL", message: "Tipo de precio sin tarifa fija" } },
        { status: 500 }
      );
    }
    priceAmount = fixed;
  }

  const commissionAmount =
    priceType === "REFERIDOS" ? commissionPerPaxForType(priceType) * seatCount : null;

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
        priceType,
        priceAmount,
        commissionAmount,
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
