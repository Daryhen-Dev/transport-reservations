import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { startOfDay, endOfDay } from "date-fns";
import { prisma } from "@/lib/db";
import { requireAuth, requireBranchAccess } from "@/lib/api/auth";
import { createQuickCargoReservationSchema } from "@/lib/api/schemas/cargo-reservations";
import { auditCreate } from "@/lib/api/audit";

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

  const parsed = createQuickCargoReservationSchema.safeParse(body);
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
    categoriaId,
    destinatario,
    description,
    weightKg,
    destinationBranchId,
    externalDestination,
    diameterCm,
    widthCm,
    heightCm,
    lengthCm,
  } = parsed.data;

  const gate = await requireBranchAccess(req, branchId);
  if (gate instanceof NextResponse) return gate;

  const schedule = await prisma.tripSchedule.findUnique({
    where: { id: scheduleId },
    include: { route: true },
  });
  if (!schedule) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Horario no encontrado" } },
      { status: 404 }
    );
  }

  const confirmadaStatus = await prisma.reservationStatus.findFirst({
    where: { name: "CONFIRMADA" },
    select: { id: true },
  });
  if (!confirmadaStatus) {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL",
          message: "Estado CONFIRMADA no encontrado. Ejecute el seed.",
        },
      },
      { status: 500 }
    );
  }

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

  try {
    const created = await prisma.$transaction(async (tx) => {
      const newDestinatario = await tx.destinatario.create({
        data: {
          firstName: destinatario.firstName,
          lastName: destinatario.lastName,
          phone: destinatario.phone ?? undefined,
          documentTypeId: destinatario.documentTypeId || undefined,
          documentNumber: destinatario.documentNumber || undefined,
        },
      });

      return tx.cargoReservation.create({
        data: {
          tripId: trip!.id,
          proveedorId,
          categoriaId: categoriaId || undefined,
          destinatarioId: newDestinatario.id,
          description: description || undefined,
          weightKg,
          destinationBranchId: destinationBranchId || undefined,
          externalDestination: externalDestination || undefined,
          diameterCm,
          widthCm,
          heightCm,
          lengthCm,
          reservationStatusId: confirmadaStatus.id,
          ...auditCreate(authOrError.userId),
        },
        include: CARGO_INCLUDE,
      });
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Error al crear la reserva de encomienda",
        },
      },
      { status: 400 }
    );
  }
}
