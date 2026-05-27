import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { updatePassengerSchema } from "@/lib/api/schemas/passengers";

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

  const parsed = updatePassengerSchema.safeParse(body);
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
    firstName,
    lastName,
    documentTypeId,
    documentNumber,
    countryId,
    phone,
    birthDate,
  } = parsed.data;

  if (documentTypeId && documentNumber) {
    const duplicate = await prisma.passenger.findFirst({
      where: {
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
            message: `Ya existe otro pasajero con ese tipo y número de documento (${documentNumber})`,
          },
        },
        { status: 409 }
      );
    }
  }

  try {
    const updated = await prisma.passenger.update({
      where: { id: params.id },
      data: {
        firstName,
        lastName,
        documentTypeId,
        documentNumber,
        countryId,
        phone: phone !== undefined ? (phone ? phone : null) : undefined,
        birthDate:
          birthDate !== undefined ? (birthDate ? new Date(birthDate) : null) : undefined,
      },
      include: {
        documentType: { select: { id: true, name: true } },
        country: { select: { id: true, name: true } },
        _count: { select: { reservations: true } },
      },
    });
    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Pasajero no encontrado" } },
      { status: 404 }
    );
  }
});

export const DELETE = withAuth<{ id: string }>(async (_req, { params }) => {
  const passenger = await prisma.passenger.findUnique({
    where: { id: params.id },
    include: { _count: { select: { reservations: true } } },
  });

  if (!passenger) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Pasajero no encontrado" } },
      { status: 404 }
    );
  }

  if (passenger._count.reservations > 0) {
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message: "No se puede eliminar un pasajero que participó en una reserva",
        },
      },
      { status: 409 }
    );
  }

  try {
    await prisma.passenger.delete({ where: { id: params.id } });
    return new Response(null, { status: 204 });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message: "No se puede eliminar el pasajero. Puede que tenga datos asociados.",
        },
      },
      { status: 409 }
    );
  }
});
