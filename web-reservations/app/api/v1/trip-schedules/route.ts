import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireBranchAccess } from "@/lib/api/auth";
import { createTripScheduleSchema } from "@/lib/api/schemas/trip-schedules";

export async function GET(req: NextRequest) {
  const authOrError = await requireAuth(req);
  if (authOrError instanceof NextResponse) return authOrError;

  const url = new URL(req.url);
  const routeId = url.searchParams.get("routeId") ?? undefined;
  const branchId = url.searchParams.get("branchId") ?? undefined;

  if (!routeId && !branchId) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "routeId or branchId is required",
        },
      },
      { status: 400 }
    );
  }

  // Resolve the branchId to gate against.
  let gateBranchId: string;
  if (routeId) {
    const route = await prisma.route.findUnique({
      where: { id: routeId },
      select: { branchId: true },
    });
    if (!route) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Ruta no encontrada" } },
        { status: 404 }
      );
    }
    gateBranchId = route.branchId;
  } else {
    gateBranchId = branchId!;
  }

  const gate = await requireBranchAccess(req, gateBranchId);
  if (gate instanceof NextResponse) return gate;

  const schedules = await prisma.tripSchedule.findMany({
    where: routeId
      ? { routeId }
      : branchId
        ? { route: { branchId } }
        : undefined,
    include: {
      route: {
        select: {
          id: true,
          origin: true,
          destination: true,
          branchId: true,
        },
      },
    },
    orderBy: [{ routeId: "asc" }, { time: "asc" }],
  });

  return NextResponse.json({ data: schedules });
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

  const parsed = createTripScheduleSchema.safeParse(body);
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

  const { routeId, time } = parsed.data;
  const isActive = parsed.data.isActive ?? true;

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

  const gate = await requireBranchAccess(req, route.branchId);
  if (gate instanceof NextResponse) return gate;

  const duplicate = await prisma.tripSchedule.findFirst({
    where: { routeId, time },
  });
  if (duplicate) {
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message: "Ya existe un horario con esa hora para la ruta seleccionada",
        },
      },
      { status: 409 }
    );
  }

  try {
    const created = await prisma.tripSchedule.create({
      data: { routeId, time, isActive },
      include: {
        route: {
          select: {
            id: true,
            origin: true,
            destination: true,
            branchId: true,
          },
        },
      },
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Error al crear el horario" } },
      { status: 400 }
    );
  }
}
