import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { createPassengerSchema } from "@/lib/api/schemas/passengers";

export const GET = withAuth(async (req) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";

  if (q.length > 0) {
    if (q.length < 2) {
      return NextResponse.json({ data: [] });
    }
    const results = await prisma.passenger.findMany({
      where: {
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { documentNumber: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        documentType: { select: { id: true, name: true } },
        documentNumber: true,
        country: { select: { id: true, name: true } },
        birthDate: true,
      },
      take: 10,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
    return NextResponse.json({ data: results });
  }

  const passengers = await prisma.passenger.findMany({
    include: {
      documentType: { select: { id: true, name: true } },
      country: { select: { id: true, name: true } },
      _count: { select: { reservations: true } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  return NextResponse.json({ data: passengers });
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

  const parsed = createPassengerSchema.safeParse(body);
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

  const duplicate = await prisma.passenger.findUnique({
    where: { documentTypeId_documentNumber: { documentTypeId, documentNumber } },
  });
  if (duplicate) {
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message: `Ya existe un pasajero con ese tipo y número de documento (${documentNumber})`,
        },
      },
      { status: 409 }
    );
  }

  const created = await prisma.passenger.create({
    data: {
      firstName,
      lastName,
      documentTypeId,
      documentNumber,
      countryId,
      phone: phone ? phone : null,
      birthDate: birthDate ? new Date(birthDate) : null,
    },
    include: {
      documentType: { select: { id: true, name: true } },
      country: { select: { id: true, name: true } },
      _count: { select: { reservations: true } },
    },
  });
  return NextResponse.json({ data: created }, { status: 201 });
});
