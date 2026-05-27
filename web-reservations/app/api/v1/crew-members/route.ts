import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { createCrewMemberSchema } from "@/lib/api/schemas/crew-members";

export const GET = withAuth(async (req) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";

  if (q.length > 0) {
    if (q.length < 2) {
      return NextResponse.json({ data: [] });
    }
    const results = await prisma.crewMember.findMany({
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
      },
      take: 10,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
    return NextResponse.json({ data: results });
  }

  const crewMembers = await prisma.crewMember.findMany({
    include: {
      documentType: { select: { id: true, name: true } },
      _count: { select: { trips: true } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  return NextResponse.json({ data: crewMembers });
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

  const parsed = createCrewMemberSchema.safeParse(body);
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

  const duplicate = await prisma.crewMember.findUnique({
    where: { documentTypeId_documentNumber: { documentTypeId, documentNumber } },
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

  const created = await prisma.crewMember.create({
    data: {
      firstName,
      lastName,
      documentTypeId,
      documentNumber,
      phone: phone ? phone : null,
      birthDate: birthDate ? new Date(birthDate) : null,
    },
    include: {
      documentType: { select: { id: true, name: true } },
      _count: { select: { trips: true } },
    },
  });
  return NextResponse.json({ data: created }, { status: 201 });
});
