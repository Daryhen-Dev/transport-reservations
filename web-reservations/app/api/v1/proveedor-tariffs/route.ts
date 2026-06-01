import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { createProveedorTariffSchema } from "@/lib/api/schemas/proveedor-tariffs";
import { auditCreate } from "@/lib/api/audit";

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

export const GET = withAuth(async (req) => {
  const url = new URL(req.url);
  const proveedorId = url.searchParams.get("proveedorId") ?? undefined;
  const routeId = url.searchParams.get("routeId") ?? undefined;
  const branchId = url.searchParams.get("branchId") ?? undefined;

  const tariffs = await prisma.proveedorTariff.findMany({
    where: {
      proveedorId,
      routeId,
      route: branchId ? { branchId } : undefined,
    },
    include: TARIFF_INCLUDE,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: tariffs });
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

  const parsed = createProveedorTariffSchema.safeParse(body);
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

  const [proveedor, route] = await Promise.all([
    prisma.proveedor.findUnique({
      where: { id: data.proveedorId },
      select: { id: true },
    }),
    prisma.route.findUnique({
      where: { id: data.routeId },
      select: { id: true },
    }),
  ]);
  if (!proveedor) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Proveedor inválido" } },
      { status: 400 }
    );
  }
  if (!route) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Ruta inválida" } },
      { status: 400 }
    );
  }

  try {
    const created = await prisma.proveedorTariff.create({
      data: {
        proveedorId: data.proveedorId,
        routeId: data.routeId,
        directPriceAmount: data.directPriceAmount ?? null,
        incomingAgencyPriceAmount: data.incomingAgencyPriceAmount ?? null,
        outgoingCommissionAmount: data.outgoingCommissionAmount ?? null,
        minPrice: data.minPrice ?? null,
        notes: data.notes ?? null,
        isActive: data.isActive ?? true,
        ...auditCreate(auth.userId),
      },
      include: TARIFF_INCLUDE,
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message: "Ya existe una tarifa para este proveedor y ruta",
        },
      },
      { status: 409 }
    );
  }
});
