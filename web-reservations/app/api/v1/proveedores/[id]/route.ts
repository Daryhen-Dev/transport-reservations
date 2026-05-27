import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { updateProveedorSchema } from "@/lib/api/schemas/proveedores";

function emptyToNullable(v: string | undefined): string | null | undefined {
  if (v === undefined) return undefined;
  return v.length > 0 ? v : null;
}

export const PATCH = withAuth<{ id: string }>(async (req, { params }) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON" } },
      { status: 400 }
    );
  }

  const parsed = updateProveedorSchema.safeParse(body);
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

  // Check duplicate when document fields are part of the update
  if (proveedorTypeId && documentTypeId && documentNumber) {
    const duplicate = await prisma.proveedor.findFirst({
      where: {
        proveedorTypeId,
        documentTypeId,
        documentNumber,
        NOT: { id: params.id },
      },
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
  }

  try {
    const updated = await prisma.proveedor.update({
      where: { id: params.id },
      data: {
        proveedorTypeId,
        firstName: emptyToNullable(firstName),
        lastName: emptyToNullable(lastName),
        countryId: emptyToNullable(countryId),
        birthDate:
          birthDate !== undefined ? (birthDate ? new Date(birthDate) : null) : undefined,
        companyName: emptyToNullable(companyName),
        taxId: emptyToNullable(taxId),
        contactName: emptyToNullable(contactName),
        documentTypeId,
        documentNumber,
        phone: emptyToNullable(phone),
      },
      include: {
        proveedorType: { select: { id: true, name: true } },
        country: { select: { id: true, name: true } },
        documentType: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Proveedor no encontrado" } },
      { status: 404 }
    );
  }
});

export const DELETE = withAuth<{ id: string }>(async (_req, { params }) => {
  const proveedor = await prisma.proveedor.findUnique({
    where: { id: params.id },
  });
  if (!proveedor) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Proveedor no encontrado" } },
      { status: 404 }
    );
  }

  const [passengerCount, cargoCount] = await Promise.all([
    prisma.passengerReservation.count({ where: { proveedorId: params.id } }),
    prisma.cargoReservation.count({ where: { proveedorId: params.id } }),
  ]);

  if (passengerCount > 0 || cargoCount > 0) {
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message: "No se puede eliminar: el proveedor tiene reservas asociadas",
        },
      },
      { status: 409 }
    );
  }

  try {
    await prisma.proveedor.delete({ where: { id: params.id } });
    return new Response(null, { status: 204 });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message:
            "No se puede eliminar el proveedor. Puede que tenga datos asociados.",
        },
      },
      { status: 409 }
    );
  }
});
