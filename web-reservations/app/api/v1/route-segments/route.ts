import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { createRouteSegmentSchema } from "@/lib/api/schemas/route-segments";
import { auditCreate } from "@/lib/api/audit";

const SEGMENT_INCLUDE = {
  operatorProveedor: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      companyName: true,
      proveedorType: { select: { id: true, name: true } },
    },
  },
} as const;

export const GET = withAuth(async (req) => {
  const url = new URL(req.url);
  const routeId = url.searchParams.get("routeId") ?? undefined;

  const segments = await prisma.routeSegment.findMany({
    where: routeId ? { routeId } : undefined,
    include: SEGMENT_INCLUDE,
    orderBy: [{ routeId: "asc" }, { position: "asc" }],
  });

  return NextResponse.json({ data: segments });
});

export const POST = withAuth(async (req, { auth }) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON" } },
      { status: 400 }
    );
  }

  const parsed = createRouteSegmentSchema.safeParse(body);
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

  const data = parsed.data;

  if (data.isExternal && !data.operatorProveedorId) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Un tramo externo requiere un operador (proveedor)",
        },
      },
      { status: 400 }
    );
  }

  const route = await prisma.route.findUnique({
    where: { id: data.routeId },
    select: { id: true },
  });
  if (!route) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Ruta inválida" } },
      { status: 400 }
    );
  }

  if (data.operatorProveedorId) {
    const op = await prisma.proveedor.findUnique({
      where: { id: data.operatorProveedorId },
      select: { proveedorType: { select: { name: true } } },
    });
    if (
      !op ||
      (op.proveedorType.name !== "AGENCIA" &&
        op.proveedorType.name !== "EMPRESA")
    ) {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "El operador debe ser un proveedor AGENCIA o EMPRESA",
          },
        },
        { status: 400 }
      );
    }
  }

  try {
    const created = await prisma.routeSegment.create({
      data: {
        routeId: data.routeId,
        position: data.position,
        origin: data.origin,
        destination: data.destination,
        isExternal: data.isExternal ?? false,
        operatorProveedorId: data.operatorProveedorId ?? null,
        externalCostAmount: data.externalCostAmount ?? null,
        notes: data.notes ?? null,
        ...auditCreate(auth.userId),
      },
      include: SEGMENT_INCLUDE,
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message: "Ya existe un tramo con esa posición en la ruta",
        },
      },
      { status: 409 }
    );
  }
});
