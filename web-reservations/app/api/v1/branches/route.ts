import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { createBranchSchema } from "@/lib/api/schemas/branches";

export const GET = withAuth(async () => {
  const branches = await prisma.branch.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ data: branches });
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

    const parsed = createBranchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: parsed.error.issues[0]?.message ?? "Invalid body",
            details: parsed.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const existing = await prisma.branch.findUnique({
      where: { slug: parsed.data.slug },
    });
    if (existing) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "El slug ya está en uso" } },
        { status: 409 }
      );
    }

    const branch = await prisma.branch.create({ data: parsed.data });
    return NextResponse.json({ data: branch }, { status: 201 });
  },
  { ownerOnly: true }
);
