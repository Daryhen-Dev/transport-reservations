import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { createExternalSaleSchema } from "@/lib/api/schemas/external-sales";
import { auditCreate } from "@/lib/api/audit";

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

export const GET = withAuth(
  async (req, { auth }) => {
    const url = new URL(req.url);
    const branchIdParam = url.searchParams.get("branchId") ?? undefined;
    const fromParam = url.searchParams.get("from") ?? undefined;
    const toParam = url.searchParams.get("to") ?? undefined;

    const branchId =
      auth.role === "SUCURSAL_USER"
        ? auth.branchId ?? undefined
        : branchIdParam;

    const from = fromParam ? new Date(fromParam) : undefined;
    const to = toParam ? new Date(toParam) : undefined;

    const sales = await prisma.externalSale.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        ...(from || to
          ? {
              departureAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      include: EXTERNAL_SALE_INCLUDE,
      orderBy: { departureAt: "desc" },
    });

    return NextResponse.json({ data: sales });
  },
  { branchScoped: true }
);

export const POST = withAuth(
  async (req, { auth }) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Invalid JSON" } },
        { status: 400 }
      );
    }

    const parsed = createExternalSaleSchema.safeParse(body);
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

    // Validar que la agencia operadora sea tipo AGENCIA
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

    let reservationStatusId = data.reservationStatusId;
    if (!reservationStatusId) {
      const confirmada = await prisma.reservationStatus.findFirst({
        where: { name: { contains: "confirmada", mode: "insensitive" } },
        select: { id: true },
      });
      if (!confirmada) {
        return NextResponse.json(
          {
            error: {
              code: "INTERNAL",
              message: "Estado CONFIRMADA no encontrado. Ejecute el seed.",
            },
          },
          { status: 500 }
        );
      }
      reservationStatusId = confirmada.id;
    }

    try {
      const created = await prisma.externalSale.create({
        data: {
          branchId: data.branchId,
          operatorAgencyId: data.operatorAgencyId,
          buyerName: data.buyerName ?? null,
          buyerDocument: data.buyerDocument ?? null,
          buyerPhone: data.buyerPhone ?? null,
          departureAt: new Date(data.departureAt),
          origin: data.origin,
          destination: data.destination,
          passengerCount: data.passengerCount,
          priceCharged: data.priceCharged,
          costPaidToOperator: data.costPaidToOperator,
          reservationStatusId,
          notes: data.notes ?? null,
          ...auditCreate(auth.userId),
        },
        include: EXTERNAL_SALE_INCLUDE,
      });
      return NextResponse.json({ data: created }, { status: 201 });
    } catch {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Error al crear la venta" } },
        { status: 400 }
      );
    }
  },
  { branchScoped: true }
);
