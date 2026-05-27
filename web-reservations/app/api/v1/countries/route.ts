import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { createCountrySchema } from "@/lib/api/schemas/countries";

export const GET = withAuth(async () => {
  const countries = await prisma.country.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ data: countries });
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

    const parsed = createCountrySchema.safeParse(body);
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

    const code = parsed.data.code || undefined;

    const nameConflict = await prisma.country.findUnique({
      where: { name: parsed.data.name },
    });
    if (nameConflict) {
      return NextResponse.json(
        {
          error: { code: "CONFLICT", message: "Ya existe un país con ese nombre" },
        },
        { status: 409 }
      );
    }

    if (code) {
      const codeConflict = await prisma.country.findUnique({ where: { code } });
      if (codeConflict) {
        return NextResponse.json(
          {
            error: { code: "CONFLICT", message: "Ya existe un país con ese código" },
          },
          { status: 409 }
        );
      }
    }

    const country = await prisma.country.create({
      data: {
        name: parsed.data.name,
        nationality: parsed.data.nationality,
        code,
      },
    });
    return NextResponse.json({ data: country }, { status: 201 });
  },
  { ownerOnly: true }
);
