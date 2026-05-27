import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { createProveedorSchema } from "@/lib/api/schemas/proveedores";

function emptyToNull(v: string | undefined | null): string | null {
  return v && v.length > 0 ? v : null;
}

export const GET = withAuth(async (req) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const typeId = url.searchParams.get("typeId")?.trim() ?? "";

  // Search mode: q present
  if (q.length > 0) {
    if (q.length < 2) {
      return NextResponse.json({ data: [] });
    }
    const results = await prisma.proveedor.findMany({
      where: {
        ...(typeId ? { proveedorTypeId: typeId } : {}),
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { companyName: { contains: q, mode: "insensitive" } },
          { documentNumber: { contains: q, mode: "insensitive" } },
        ],
      },
      include: {
        proveedorType: { select: { id: true, name: true } },
        documentType: { select: { id: true, name: true } },
        country: { select: { id: true, name: true } },
      },
      take: 10,
    });
    return NextResponse.json({ data: results });
  }

  // List mode (optional typeId filter)
  const proveedores = await prisma.proveedor.findMany({
    where: typeId ? { proveedorTypeId: typeId } : undefined,
    include: {
      proveedorType: { select: { id: true, name: true } },
      country: { select: { id: true, name: true } },
      documentType: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ data: proveedores });
});

export const POST = withAuth(async (req) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON" } },
      { status: 400 }
    );
  }

  const parsed = createProveedorSchema.safeParse(body);
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

  const {
    proveedorTypeId,
    firstName,
    lastName,
    countryId,
    birthDate,
    companyName,
    taxId,
    contactName,
    documentTypeId,
    documentNumber,
    phone,
  } = parsed.data;

  const proveedorType = await prisma.proveedorType.findUnique({
    where: { id: proveedorTypeId },
  });
  if (!proveedorType) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Tipo de proveedor inválido",
        },
      },
      { status: 400 }
    );
  }

  const duplicate = await prisma.proveedor.findFirst({
    where: { proveedorTypeId, documentTypeId, documentNumber },
  });
  if (duplicate) {
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message: "Ya existe un proveedor con ese documento",
        },
      },
      { status: 409 }
    );
  }

  const created = await prisma.proveedor.create({
    data: {
      proveedorTypeId,
      firstName: emptyToNull(firstName),
      lastName: emptyToNull(lastName),
      countryId: emptyToNull(countryId),
      birthDate: birthDate ? new Date(birthDate) : null,
      companyName: emptyToNull(companyName),
      taxId: emptyToNull(taxId),
      contactName: emptyToNull(contactName),
      documentTypeId,
      documentNumber,
      phone: emptyToNull(phone),
    },
    include: {
      proveedorType: { select: { id: true, name: true } },
      country: { select: { id: true, name: true } },
      documentType: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json({ data: created }, { status: 201 });
});
