import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireBranchAccess } from "@/lib/api/auth";
import { updateTripScheduleSchema } from "@/lib/api/schemas/trip-schedules";
import { auditUpdate } from "@/lib/api/audit";

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

  const parsed = updateTripScheduleSchema.safeParse(body);
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

  const existing = await prisma.tripSchedule.findUnique({
    where: { id },
    include: { route: { select: { branchId: true } } },
  });
  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Horario no encontrado" } },
      { status: 404 }
    );
  }

  const gate = await requireBranchAccess(req, existing.route.branchId);
  if (gate instanceof NextResponse) return gate;

  const { time, isActive } = parsed.data;

  // Duplicate check when time is changing.
  if (time && time !== existing.time) {
    const duplicate = await prisma.tripSchedule.findFirst({
      where: { routeId: existing.routeId, time, NOT: { id } },
    });
    if (duplicate) {
      return NextResponse.json(
        {
          error: {
            code: "CONFLICT",
            message:
              "Ya existe un horario con esa hora para la ruta seleccionada",
          },
        },
        { status: 409 }
      );
    }
  }

  try {
    const updated = await prisma.tripSchedule.update({
      where: { id },
      data: {
        time,
        isActive,
        ...auditUpdate(authOrError.userId),
      },
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
    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Error al actualizar el horario",
        },
      },
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

  const existing = await prisma.tripSchedule.findUnique({
    where: { id },
    include: { route: { select: { branchId: true } } },
  });
  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Horario no encontrado" } },
      { status: 404 }
    );
  }

  const gate = await requireBranchAccess(req, existing.route.branchId);
  if (gate instanceof NextResponse) return gate;

  const tripCount = await prisma.trip.count({ where: { scheduleId: id } });
  if (tripCount > 0) {
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message:
            "No se puede eliminar el horario porque tiene viajes asociados",
        },
      },
      { status: 409 }
    );
  }

  try {
    await prisma.tripSchedule.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message:
            "No se puede eliminar el horario. Puede que tenga datos asociados.",
        },
      },
      { status: 409 }
    );
  }
}
