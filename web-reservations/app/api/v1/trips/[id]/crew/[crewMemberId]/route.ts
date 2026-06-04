import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireBranchAccess } from "@/lib/api/auth";
import { assignCrewSchema } from "@/lib/api/schemas/trips";
import { formatDateTimeShort } from "@/lib/format-date";

const ASSIGNMENT_SELECT = {
  tripId: true,
  crewMemberId: true,
  crewRoleId: true,
  assignedAt: true,
  crewMember: { select: { id: true, firstName: true, lastName: true } },
  crewRole: { select: { id: true, name: true } },
} as const;

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; crewMemberId: string }> }
) {
  const authOrError = await requireAuth(req);
  if (authOrError instanceof NextResponse) return authOrError;

  const { id: tripId, crewMemberId } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON" } },
      { status: 400 }
    );
  }

  const parsed = assignCrewSchema.safeParse(body);
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

  const { crewRoleId } = parsed.data;

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: {
      id: true,
      branchId: true,
      departureAt: true,
      status: { select: { name: true } },
    },
  });
  if (!trip) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Viaje no encontrado" } },
      { status: 404 }
    );
  }

  const gate = await requireBranchAccess(req, trip.branchId);
  if (gate instanceof NextResponse) return gate;

  // V4 — no tocar tripulación de un viaje cerrado.
  if (trip.status.name === "CERRADO") {
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message: "No se puede modificar la tripulación de un viaje cerrado",
        },
      },
      { status: 409 }
    );
  }

  // Validate crew member exists.
  const crewMember = await prisma.crewMember.findUnique({
    where: { id: crewMemberId },
    select: { id: true },
  });
  if (!crewMember) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Tripulante no encontrado" } },
      { status: 404 }
    );
  }

  // Validate crew role exists.
  const crewRole = await prisma.crewRole.findUnique({
    where: { id: crewRoleId },
    select: { id: true, name: true },
  });
  if (!crewRole) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Rol inválido" } },
      { status: 400 }
    );
  }

  // This crew member already on this trip?
  const existingAssignment = await prisma.tripCrew.findUnique({
    where: { tripId_crewMemberId: { tripId, crewMemberId } },
  });

  // Reglas por rol:
  //   CAPITAN    → max 1 por viaje
  //   TRIPULANTE → max 2 por viaje
  if (crewRole.name === "CAPITAN") {
    const existingCaptain = await prisma.tripCrew.findFirst({
      where: {
        tripId,
        crewRole: { name: "CAPITAN" },
        NOT: { crewMemberId },
      },
    });
    if (existingCaptain) {
      return NextResponse.json(
        {
          error: {
            code: "CONFLICT",
            message: "Ya hay un capitán asignado a este viaje",
          },
        },
        { status: 409 }
      );
    }
  } else if (crewRole.name === "TRIPULANTE") {
    // Si el miembro ya era TRIPULANTE en este viaje, es no-op (no suma).
    const willCount = existingAssignment?.crewRoleId !== crewRoleId;
    if (willCount) {
      const tripulanteCount = await prisma.tripCrew.count({
        where: {
          tripId,
          crewRole: { name: "TRIPULANTE" },
          NOT: { crewMemberId },
        },
      });
      if (tripulanteCount >= 2) {
        return NextResponse.json(
          {
            error: {
              code: "CONFLICT",
              message: "Ya hay 2 tripulantes asignados a este viaje (máximo)",
            },
          },
          { status: 409 }
        );
      }
    }
  }

  // V1 — overlap temporal: no asignar el mismo tripulante a otro viaje que
  // salga dentro de ±4 horas del viaje target.
  const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
  const lowerBound = new Date(trip.departureAt.getTime() - FOUR_HOURS_MS);
  const upperBound = new Date(trip.departureAt.getTime() + FOUR_HOURS_MS);
  const overlap = await prisma.tripCrew.findFirst({
    where: {
      crewMemberId,
      NOT: { tripId },
      trip: { departureAt: { gte: lowerBound, lte: upperBound } },
    },
    select: {
      trip: {
        select: {
          departureAt: true,
          route: { select: { origin: true, destination: true } },
        },
      },
    },
  });
  if (overlap) {
    const when = formatDateTimeShort(overlap.trip.departureAt);
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message: `Este tripulante ya está en otro viaje cercano: ${overlap.trip.route.origin} → ${overlap.trip.route.destination} (${when}). Ventana mínima de 4 h entre viajes.`,
        },
      },
      { status: 409 }
    );
  }

  try {
    const assignment = await prisma.tripCrew.upsert({
      where: { tripId_crewMemberId: { tripId, crewMemberId } },
      update: { crewRoleId },
      create: { tripId, crewMemberId, crewRoleId },
      select: ASSIGNMENT_SELECT,
    });

    // Minimo cumplido = capitan asignado. El operador decide si suma
    // tripulantes o cierra el viaje ya.
    const captainAssigned = await prisma.tripCrew.findFirst({
      where: { tripId, crewRole: { name: "CAPITAN" } },
      select: { crewMemberId: true },
    });
    const hasMinimumCrew = captainAssigned !== null;

    return NextResponse.json({
      data: { ...assignment, hasMinimumCrew, allCrewAssigned: hasMinimumCrew },
    });
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Error al asignar tripulante" } },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; crewMemberId: string }> }
) {
  const authOrError = await requireAuth(req);
  if (authOrError instanceof NextResponse) return authOrError;

  const { id: tripId, crewMemberId } = await ctx.params;

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: {
      id: true,
      branchId: true,
      status: { select: { name: true } },
    },
  });
  if (!trip) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Viaje no encontrado" } },
      { status: 404 }
    );
  }

  const gate = await requireBranchAccess(req, trip.branchId);
  if (gate instanceof NextResponse) return gate;

  // V4 — no tocar tripulación de un viaje cerrado.
  if (trip.status.name === "CERRADO") {
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message: "No se puede modificar la tripulación de un viaje cerrado",
        },
      },
      { status: 409 }
    );
  }

  try {
    await prisma.tripCrew.delete({
      where: { tripId_crewMemberId: { tripId, crewMemberId } },
    });
    return new Response(null, { status: 204 });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Tripulante no asignado a este viaje",
        },
      },
      { status: 404 }
    );
  }
}
