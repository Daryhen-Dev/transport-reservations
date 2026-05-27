import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { createTripStatusSchema } from "@/lib/api/schemas/trip-statuses";

export const GET = withAuth(async () => {
  const statuses = await prisma.tripStatus.findMany({
    include: { _count: { select: { trips: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ data: statuses });
});

export const POST = withAuth(
  async (req) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Invalid JSON" } },
        { status: 400 }
      );
    }
    const parsed = createTripStatusSchema.safeParse(body);
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

    const existing = await prisma.tripStatus.findUnique({
      where: { name: parsed.data.name },
    });
    if (existing) {
      return NextResponse.json(
        {
          error: { code: "CONFLICT", message: "Ya existe un estado con ese nombre" },
        },
        { status: 409 }
      );
    }

    const status = await prisma.tripStatus.create({ data: parsed.data });
    return NextResponse.json({ data: status }, { status: 201 });
  },
  { ownerOnly: true }
);
