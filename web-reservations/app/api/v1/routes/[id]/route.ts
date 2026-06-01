import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireBranchAccess } from "@/lib/api/auth";
import { updateRouteSchema } from "@/lib/api/schemas/routes";
import { auditUpdate } from "@/lib/api/audit";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const authOrError = await requireAuth(req);
  if (authOrError instanceof NextResponse) return authOrError;

  const { id } = await ctx.params;
  const route = await prisma.route.findUnique({
    where: { id },
    include: {
      branch: { select: { id: true, name: true, slug: true } },
    },
  });
  if (!route) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Ruta no encontrada" } },
      { status: 404 }
    );
  }

  const gate = await requireBranchAccess(req, route.branchId);
  if (gate instanceof NextResponse) return gate;

  return NextResponse.json({ data: route });
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

  const parsed = updateRouteSchema.safeParse(body);
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

  const existing = await prisma.route.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Ruta no encontrada" } },
      { status: 404 }
    );
  }

  // Gate against current branch ownership.
  const gate = await requireBranchAccess(req, existing.branchId);
  if (gate instanceof NextResponse) return gate;

  const {
    origin,
    destination,
    branchId,
    directPriceAmount,
    incomingAgencyPriceAmount,
    outgoingCommissionAmount,
    minPrice,
  } = parsed.data;

  // If branchId is changing, validate the target branch + ensure access.
  if (branchId && branchId !== existing.branchId) {
    const targetBranch = await prisma.branch.findUnique({
      where: { id: branchId },
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

  try {
    const updated = await prisma.route.update({
      where: { id },
      data: {
        origin,
        destination,
        branchId,
        directPriceAmount,
        incomingAgencyPriceAmount,
        outgoingCommissionAmount,
        minPrice,
        ...auditUpdate(authOrError.userId),
      },
      include: {
        branch: { select: { id: true, name: true, slug: true } },
      },
    });
    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Error al actualizar la ruta" } },
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

  const existing = await prisma.route.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Ruta no encontrada" } },
      { status: 404 }
    );
  }

  const gate = await requireBranchAccess(req, existing.branchId);
  if (gate instanceof NextResponse) return gate;

  const tripCount = await prisma.trip.count({ where: { routeId: id } });
  if (tripCount > 0) {
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message:
            "No se puede eliminar la ruta porque tiene viajes asociados",
        },
      },
      { status: 409 }
    );
  }

  try {
    await prisma.route.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message:
            "No se puede eliminar la ruta. Puede que tenga datos asociados.",
        },
      },
      { status: 409 }
    );
  }
}
