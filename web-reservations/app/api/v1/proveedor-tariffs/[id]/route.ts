import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { updateProveedorTariffSchema } from "@/lib/api/schemas/proveedor-tariffs";
import { auditUpdate } from "@/lib/api/audit";

const TARIFF_INCLUDE = {
  proveedor: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      companyName: true,
      proveedorType: { select: { id: true, name: true } },
    },
  },
  route: {
    select: {
      id: true,
      origin: true,
      destination: true,
      branchId: true,
      branch: { select: { id: true, name: true } },
      directPriceAmount: true,
      incomingAgencyPriceAmount: true,
      outgoingCommissionAmount: true,
      minPrice: true,
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

  const parsed = updateProveedorTariffSchema.safeParse(body);
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
  try {
    const updated = await prisma.proveedorTariff.update({
      where: { id: params.id },
      data: {
        directPriceAmount: data.directPriceAmount,
        incomingAgencyPriceAmount: data.incomingAgencyPriceAmount,
        outgoingCommissionAmount: data.outgoingCommissionAmount,
        minPrice: data.minPrice,
        notes: data.notes,
        isActive: data.isActive,
        ...auditUpdate(auth.userId),
      },
      include: TARIFF_INCLUDE,
    });
    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Tarifa no encontrada" } },
      { status: 404 }
    );
  }
});

export const DELETE = withAuth<{ id: string }>(async (_req, { params }) => {
  try {
    await prisma.proveedorTariff.delete({ where: { id: params.id } });
    return new Response(null, { status: 204 });
  } catch {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Tarifa no encontrada" } },
      { status: 404 }
    );
  }
});
