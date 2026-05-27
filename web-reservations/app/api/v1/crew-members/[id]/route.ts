import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { updateCrewMemberSchema } from "@/lib/api/schemas/crew-members";

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

  const parsed = updateCrewMemberSchema.safeParse(body);
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

  const { firstName, lastName, documentTypeId, documentNumber, phone, birthDate } =
    parsed.data;

  if (documentTypeId && documentNumber) {
    const duplicate = await prisma.crewMember.findFirst({
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
            message: "Ya existe un tripulante con ese documento",
          },
        },
        { status: 409 }
      );
    }
  }

  try {
    const updated = await prisma.crewMember.update({
      where: { id: params.id },
      data: {
        firstName,
        lastName,
        documentTypeId,
        documentNumber,
        phone: phone !== undefined ? (phone ? phone : null) : undefined,
        birthDate:
          birthDate !== undefined ? (birthDate ? new Date(birthDate) : null) : undefined,
      },
      include: {
        documentType: { select: { id: true, name: true } },
        _count: { select: { trips: true } },
      },
    });
    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Tripulante no encontrado" } },
      { status: 404 }
    );
  }
});

export const DELETE = withAuth<{ id: string }>(async (_req, { params }) => {
  const member = await prisma.crewMember.findUnique({
    where: { id: params.id },
    include: { _count: { select: { trips: true } } },
  });

  if (!member) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Tripulante no encontrado" } },
      { status: 404 }
    );
  }

  if (member._count.trips > 0) {
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message: "No se puede eliminar un tripulante asignado a viajes",
        },
      },
      { status: 409 }
    );
  }

  try {
    await prisma.crewMember.delete({ where: { id: params.id } });
    return new Response(null, { status: 204 });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message: "No se puede eliminar el tripulante. Puede que tenga datos asociados.",
        },
      },
      { status: 409 }
    );
  }
});
