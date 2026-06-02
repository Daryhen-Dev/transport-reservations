import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { updateExternalSaleSchema } from "@/lib/api/schemas/external-sales";
import { auditUpdate } from "@/lib/api/audit";
import { requireBranchAccess } from "@/lib/api/auth";

const EXTERNAL_SALE_INCLUDE = {
  branch: { select: { id: true, name: true, slug: true } },
  operatorAgency: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      companyName: true,
      proveedorType: { select: { id: true, name: true } },
    },
  },
  reservationStatus: { select: { id: true, name: true } },
} as const;

export const GET = withAuth<{ id: string }>(async (req, { params }) => {
  const sale = await prisma.externalSale.findUnique({
    where: { id: params.id },
    include: EXTERNAL_SALE_INCLUDE,
  });
  if (!sale) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Venta no encontrada" } },
      { status: 404 }
    );
  }
  const gate = await requireBranchAccess(req, sale.branchId);
  if (gate instanceof NextResponse) return gate;
  return NextResponse.json({ data: sale });
});

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

  const parsed = updateExternalSaleSchema.safeParse(body);
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

  const existing = await prisma.externalSale.findUnique({
    where: { id: params.id },
    select: { branchId: true },
  });
  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Venta no encontrada" } },
      { status: 404 }
    );
  }
  const gate = await requireBranchAccess(req, existing.branchId);
  if (gate instanceof NextResponse) return gate;

  const data = parsed.data;

  if (data.operatorAgencyId) {
    const operator = await prisma.proveedor.findUnique({
      where: { id: data.operatorAgencyId },
      include: { proveedorType: { select: { name: true } } },
    });
    if (!operator || operator.proveedorType.name !== "AGENCIA") {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "La agencia operadora debe ser un proveedor tipo AGENCIA",
          },
        },
        { status: 400 }
      );
    }
  }

  try {
    const updated = await prisma.externalSale.update({
      where: { id: params.id },
      data: {
        operatorAgencyId: data.operatorAgencyId,
        buyerName: data.buyerName,
        buyerDocument: data.buyerDocument,
        buyerPhone: data.buyerPhone,
        departureAt: data.departureAt ? new Date(data.departureAt) : undefined,
        origin: data.origin,
        destination: data.destination,
        passengerCount: data.passengerCount,
        priceCharged: data.priceCharged,
        costPaidToOperator: data.costPaidToOperator,
        reservationStatusId: data.reservationStatusId,
        notes: data.notes,
        ...auditUpdate(auth.userId),
      },
      include: EXTERNAL_SALE_INCLUDE,
    });
    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Error al actualizar" } },
      { status: 400 }
    );
  }
});

export const DELETE = withAuth<{ id: string }>(async (req, { params }) => {
  const existing = await prisma.externalSale.findUnique({
    where: { id: params.id },
    select: { branchId: true },
  });
  if (!existing) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Venta no encontrada" } },
      { status: 404 }
    );
  }
  const gate = await requireBranchAccess(req, existing.branchId);
  if (gate instanceof NextResponse) return gate;

  try {
    await prisma.externalSale.delete({ where: { id: params.id } });
    return new Response(null, { status: 204 });
  } catch {
    return NextResponse.json(
      { error: { code: "CONFLICT", message: "Error al eliminar" } },
      { status: 409 }
    );
  }
});
