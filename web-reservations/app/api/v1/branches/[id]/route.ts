import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { updateBranchSchema } from "@/lib/api/schemas/branches";

export const GET = withAuth<{ id: string }>(async (_req, { params }) => {
  const branch = await prisma.branch.findUnique({ where: { id: params.id } });
  if (!branch) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Sucursal no encontrada" } },
      { status: 404 }
    );
  }
  return NextResponse.json({ data: branch });
});

export const PATCH = withAuth<{ id: string }>(
  async (req, { params }) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Invalid JSON" } },
        { status: 400 }
      );
    }

    const parsed = updateBranchSchema.safeParse(body);
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

    if (parsed.data.slug) {
      const conflict = await prisma.branch.findFirst({
        where: { slug: parsed.data.slug, id: { not: params.id } },
      });
      if (conflict) {
        return NextResponse.json(
          { error: { code: "CONFLICT", message: "El slug ya está en uso" } },
          { status: 409 }
        );
      }
    }

    try {
      const branch = await prisma.branch.update({
        where: { id: params.id },
        data: parsed.data,
      });
      return NextResponse.json({ data: branch });
    } catch {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Sucursal no encontrada" } },
        { status: 404 }
      );
    }
  },
  { ownerOnly: true }
);

export const DELETE = withAuth<{ id: string }>(
  async (_req, { params }) => {
    const [userCount, tripCount, routeCount] = await Promise.all([
      prisma.user.count({ where: { branchId: params.id } }),
      prisma.trip.count({ where: { branchId: params.id } }),
      prisma.route.count({ where: { branchId: params.id } }),
    ]);
    if (userCount + tripCount + routeCount > 0) {
      return NextResponse.json(
        {
          error: {
            code: "CONFLICT",
            message:
              "No se puede eliminar la sucursal: tiene usuarios, rutas o viajes asociados",
          },
        },
        { status: 409 }
      );
    }

    try {
      await prisma.branch.delete({ where: { id: params.id } });
      return new Response(null, { status: 204 });
    } catch {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Sucursal no encontrada" } },
        { status: 404 }
      );
    }
  },
  { ownerOnly: true }
);
