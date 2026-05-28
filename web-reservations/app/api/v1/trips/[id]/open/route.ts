import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireBranchAccess } from "@/lib/api/auth";
import { auditUpdate } from "@/lib/api/audit";

const TRIP_INCLUDE = {
  route: { select: { id: true, origin: true, destination: true, branchId: true } },
  branch: { select: { id: true, name: true, slug: true } },
  status: { select: { id: true, name: true } },
  schedule: {
    select: { id: true, routeId: true, time: true, isActive: true },
  },
  crew: {
    include: {
      crewMember: { select: { id: true, firstName: true, lastName: true } },
      crewRole: { select: { id: true, name: true } },
    },
  },
  manifest: { select: { id: true, code: true } },
} as const;

// Per addendum #9: BOTH OWNER and SUCURSAL_USER may reopen a trip IF
// trip.branchId matches the requester's branch. This is the same
// uniform branch-scoped gate used for the rest of the trip endpoints.
export async function POST(
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

  try {
    const updated = await prisma.trip.update({
      where: { id },
      data: { statusId: abierto.id, ...auditUpdate(authOrError.userId) },
      include: TRIP_INCLUDE,
    });
    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Error al reabrir el viaje" } },
      { status: 400 }
    );
  }
}
