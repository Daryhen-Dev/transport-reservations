import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireBranchAccess } from "@/lib/api/auth";
import { assignCrewSchema } from "@/lib/api/schemas/trips";

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
    select: { id: true, branchId: true },
  });
  if (!trip) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Viaje no encontrado" } },
      { status: 404 }
    );
  }

  const gate = await requireBranchAccess(req, trip.branchId);
  if (gate instanceof NextResponse) return gate;

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
    select: { id: true },
  });
  if (!crewRole) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Rol inválido" } },
      { status: 400 }
    );
  }

  // Role already taken by a different crew member on this trip?
  const roleConflict = await prisma.tripCrew.findUnique({
    where: { tripId_crewRoleId: { tripId, crewRoleId } },
  });
  if (roleConflict && roleConflict.crewMemberId !== crewMemberId) {
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message: "Ese rol ya está asignado a otro tripulante en este viaje",
        },
      },
      { status: 409 }
    );
  }

  // This crew member already on this trip with a different role?
  const memberConflict = await prisma.tripCrew.findUnique({
    where: { tripId_crewMemberId: { tripId, crewMemberId } },
  });
  if (memberConflict && memberConflict.crewRoleId !== crewRoleId) {
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message: "Este tripulante ya está asignado a este viaje con otro rol",
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

    const [totalRoles, assignedRoles] = await Promise.all([
      prisma.crewRole.count(),
      prisma.tripCrew.count({ where: { tripId } }),
    ]);
    const allCrewAssigned = assignedRoles >= totalRoles;

    return NextResponse.json({ data: { ...assignment, allCrewAssigned } });
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
    select: { id: true, branchId: true },
  });
  if (!trip) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Viaje no encontrado" } },
      { status: 404 }
    );
  }

  const gate = await requireBranchAccess(req, trip.branchId);
  if (gate instanceof NextResponse) return gate;

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
