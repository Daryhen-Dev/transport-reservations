import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { updateRouteSegmentSchema } from "@/lib/api/schemas/route-segments";
import { auditUpdate } from "@/lib/api/audit";

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

export const PATCH = withAuth<{ id: string }>(async (req, { auth, params }) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON" } },
      { status: 400 }
    );
  }

  const parsed = updateRouteSegmentSchema.safeParse(body);
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

  if (data.isExternal === true && data.operatorProveedorId === null) {
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
    const updated = await prisma.routeSegment.update({
      where: { id: params.id },
      data: {
        position: data.position,
        origin: data.origin,
        destination: data.destination,
        isExternal: data.isExternal,
        operatorProveedorId: data.operatorProveedorId,
        externalCostAmount: data.externalCostAmount,
        notes: data.notes,
        ...auditUpdate(auth.userId),
      },
      include: SEGMENT_INCLUDE,
    });
    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Tramo no encontrado" } },
      { status: 404 }
    );
  }
});

export const DELETE = withAuth<{ id: string }>(async (_req, { params }) => {
  try {
    await prisma.routeSegment.delete({ where: { id: params.id } });
    return new Response(null, { status: 204 });
  } catch {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Tramo no encontrado" } },
      { status: 404 }
    );
  }
});
