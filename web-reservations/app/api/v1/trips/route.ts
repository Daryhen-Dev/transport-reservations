import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { startOfDay, endOfDay, startOfMonth, endOfMonth, parse } from "date-fns";
import { prisma } from "@/lib/db";
import { requireAuth, requireBranchAccess } from "@/lib/api/auth";
import { createTripSchema } from "@/lib/api/schemas/trips";
import { auditCreate } from "@/lib/api/audit";

const TRIP_INCLUDE = {
  route: { select: { id: true, origin: true, destination: true, branchId: true } },
  branch: { select: { id: true, name: true, slug: true } },
  status: { select: { id: true, name: true } },
  schedule: {
    select: {
      id: true,
      routeId: true,
      time: true,
      isActive: true,
    },
  },
  crew: {
    include: {
      crewMember: { select: { id: true, firstName: true, lastName: true } },
      crewRole: { select: { id: true, name: true } },
    },
  },
  manifest: { select: { id: true, code: true } },
} as const;

function parseDateFilter(value: string): { gte: Date; lte: Date } | null {
  // Accept YYYY-MM (month) or YYYY-MM-DD (single day).
  if (/^\d{4}-\d{2}$/.test(value)) {
    const d = parse(value, "yyyy-MM", new Date());
    if (isNaN(d.getTime())) return null;
    return { gte: startOfMonth(d), lte: endOfMonth(d) };
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = parse(value, "yyyy-MM-dd", new Date());
    if (isNaN(d.getTime())) return null;
    return { gte: startOfDay(d), lte: endOfDay(d) };
  }
  return null;
}

export async function GET(req: NextRequest) {
  const authOrError = await requireAuth(req);
  if (authOrError instanceof NextResponse) return authOrError;

  const url = new URL(req.url);
  const branchId = url.searchParams.get("branchId") ?? undefined;
  const date = url.searchParams.get("date") ?? undefined;

  if (!branchId) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "branchId required" } },
      { status: 400 }
    );
  }

  const gate = await requireBranchAccess(req, branchId);
  if (gate instanceof NextResponse) return gate;

  let departureFilter: { gte: Date; lte: Date } | undefined;
  if (date) {
    const parsed = parseDateFilter(date);
    if (!parsed) {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "date must be YYYY-MM or YYYY-MM-DD",
          },
        },
        { status: 400 }
      );
    }
    departureFilter = parsed;
  }

  const trips = await prisma.trip.findMany({
    where: {
      branchId,
      ...(departureFilter ? { departureAt: departureFilter } : {}),
    },
    include: TRIP_INCLUDE,
    orderBy: { departureAt: "desc" },
  });

  return NextResponse.json({ data: trips });
}

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

  const parsed = createTripSchema.safeParse(body);
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

  const { departureAt, routeId, branchId, scheduleId } = parsed.data;

  const gate = await requireBranchAccess(req, branchId);
  if (gate instanceof NextResponse) return gate;

  // Validate route belongs to the same branch.
  const route = await prisma.route.findUnique({
    where: { id: routeId },
    select: { branchId: true },
  });
  if (!route) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Ruta inválida" } },
      { status: 400 }
    );
  }
  if (route.branchId !== branchId) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "La ruta no pertenece a la sucursal seleccionada",
        },
      },
      { status: 400 }
    );
  }

  // If a schedule was provided, ensure it belongs to the same route and that
  // no other trip already exists for that schedule on the chosen day.
  if (scheduleId) {
    const schedule = await prisma.tripSchedule.findUnique({
      where: { id: scheduleId },
      select: { routeId: true },
    });
    if (!schedule || schedule.routeId !== routeId) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Horario inválido" } },
        { status: 400 }
      );
    }
    const dayStart = startOfDay(departureAt);
    const dayEnd = endOfDay(departureAt);
    const count = await prisma.trip.count({
      where: { scheduleId, departureAt: { gte: dayStart, lte: dayEnd } },
    });
    if (count > 0) {
      return NextResponse.json(
        {
          error: {
            code: "CONFLICT",
            message: "Ya existe un viaje con este horario en la fecha seleccionada",
          },
        },
        { status: 409 }
      );
    }
  }

  // Resolve status (default to ABIERTO).
  let statusId = parsed.data.statusId;
  if (!statusId) {
    const abierto = await prisma.tripStatus.findUnique({
      where: { name: "ABIERTO" },
      select: { id: true },
    });
    if (!abierto) {
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
    statusId = abierto.id;
  }

  try {
    const created = await prisma.trip.create({
      data: {
        departureAt,
        routeId,
        branchId,
        scheduleId: scheduleId ?? null,
        statusId,
        ...auditCreate(authOrError.userId),
      },
      include: TRIP_INCLUDE,
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Error al crear el viaje" } },
      { status: 400 }
    );
  }
}
