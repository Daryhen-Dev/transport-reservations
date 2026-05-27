import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { startOfDay, endOfDay } from "date-fns";
import { prisma } from "@/lib/db";
import { requireAuth, requireBranchAccess } from "@/lib/api/auth";
import { updateTripSchema } from "@/lib/api/schemas/trips";

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

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const authOrError = await requireAuth(req);
  if (authOrError instanceof NextResponse) return authOrError;

  const { id } = await ctx.params;
  const trip = await prisma.trip.findUnique({
    where: { id },
    include: TRIP_INCLUDE,
  });
  if (!trip) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Viaje no encontrado" } },
      { status: 404 }
    );
  }

  const gate = await requireBranchAccess(req, trip.branchId);
  if (gate instanceof NextResponse) return gate;

  return NextResponse.json({ data: trip });
}

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

  const parsed = updateTripSchema.safeParse(body);
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

  const existing = await prisma.trip.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Viaje no encontrado" } },
      { status: 404 }
    );
  }

  const gate = await requireBranchAccess(req, existing.branchId);
  if (gate instanceof NextResponse) return gate;

  const { departureAt, routeId, branchId, scheduleId, statusId } = parsed.data;

  // If branchId is changing, validate access to the new branch too.
  if (branchId && branchId !== existing.branchId) {
    const targetBranch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true },
    });
    if (!targetBranch) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Sucursal inválida" } },
        { status: 400 }
      );
    }
    const targetGate = await requireBranchAccess(req, branchId);
    if (targetGate instanceof NextResponse) return targetGate;
  }

  // Validate route + branch consistency.
  const finalBranchId = branchId ?? existing.branchId;
  const finalRouteId = routeId ?? existing.routeId;
  if (routeId || branchId) {
    const route = await prisma.route.findUnique({
      where: { id: finalRouteId },
      select: { branchId: true },
    });
    if (!route) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Ruta inválida" } },
        { status: 400 }
      );
    }
    if (route.branchId !== finalBranchId) {
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
  }

  // Validate schedule and check daily collision when relevant.
  const finalScheduleId =
    scheduleId === undefined ? existing.scheduleId : scheduleId;
  const finalDepartureAt = departureAt ?? existing.departureAt;
  if (finalScheduleId) {
    const schedule = await prisma.tripSchedule.findUnique({
      where: { id: finalScheduleId },
      select: { routeId: true },
    });
    if (!schedule || schedule.routeId !== finalRouteId) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Horario inválido" } },
        { status: 400 }
      );
    }
    const dayStart = startOfDay(finalDepartureAt);
    const dayEnd = endOfDay(finalDepartureAt);
    const count = await prisma.trip.count({
      where: {
        scheduleId: finalScheduleId,
        departureAt: { gte: dayStart, lte: dayEnd },
        NOT: { id },
      },
    });
    if (count > 0) {
      return NextResponse.json(
        {
          error: {
            code: "CONFLICT",
            message:
              "Ya existe un viaje con este horario en la fecha seleccionada",
          },
        },
        { status: 409 }
      );
    }
  }

  try {
    const updated = await prisma.trip.update({
      where: { id },
      data: {
        departureAt,
        routeId,
        branchId,
        scheduleId: scheduleId === undefined ? undefined : scheduleId,
        statusId,
      },
      include: TRIP_INCLUDE,
    });
    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Error al actualizar el viaje" } },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const authOrError = await requireAuth(req);
  if (authOrError instanceof NextResponse) return authOrError;

  const { id } = await ctx.params;

  const existing = await prisma.trip.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Viaje no encontrado" } },
      { status: 404 }
    );
  }

  const gate = await requireBranchAccess(req, existing.branchId);
  if (gate instanceof NextResponse) return gate;

  const [passengerCount, cargoCount] = await Promise.all([
    prisma.passengerReservation.count({ where: { tripId: id } }),
    prisma.cargoReservation.count({ where: { tripId: id } }),
  ]);
  if (passengerCount > 0 || cargoCount > 0) {
    const parts: string[] = [];
    if (passengerCount > 0)
      parts.push(`${passengerCount} reserva(s) de pasajeros`);
    if (cargoCount > 0) parts.push(`${cargoCount} encomienda(s)`);
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message: `No se puede eliminar el viaje: tiene ${parts.join(" y ")} asociada(s)`,
        },
      },
      { status: 409 }
    );
  }

  try {
    await prisma.trip.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message:
            "No se puede eliminar el viaje. Puede que tenga datos asociados.",
        },
      },
      { status: 409 }
    );
  }
}
