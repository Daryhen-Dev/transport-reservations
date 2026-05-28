import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireBranchAccess } from "@/lib/api/auth";
import { auditUpdate } from "@/lib/api/audit";

export async function PATCH(
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

  try {
    const updated = await prisma.tripSchedule.update({
      where: { id },
      data: { isActive: !existing.isActive, ...auditUpdate(authOrError.userId) },
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
