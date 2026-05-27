import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { createRouteSchema } from "@/lib/api/schemas/routes";

export const GET = withAuth(
  async (req) => {
    const url = new URL(req.url);
    const branchId = url.searchParams.get("branchId") ?? undefined;

    const routes = await prisma.route.findMany({
      where: branchId ? { branchId } : undefined,
      include: {
        branch: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ data: routes });
  },
  { branchScoped: true }
);

export const POST = withAuth(
  async (req) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Invalid JSON" } },
        { status: 400 }
      );
    }

    const parsed = createRouteSchema.safeParse(body);
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

    const { origin, destination, branchId } = parsed.data;

    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Sucursal inválida" } },
        { status: 400 }
      );
    }

    try {
      const created = await prisma.route.create({
        data: { origin, destination, branchId },
        include: {
          branch: { select: { id: true, name: true, slug: true } },
        },
      });
      return NextResponse.json({ data: created }, { status: 201 });
    } catch {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Error al crear la ruta" } },
        { status: 400 }
      );
    }
  },
  { branchScoped: true }
);
