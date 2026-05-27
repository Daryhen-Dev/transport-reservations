import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { updateCountrySchema } from "@/lib/api/schemas/countries";

export const PATCH = withAuth<{ id: string }>(
  async (req, { params }) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Invalid JSON" } },
        { status: 400 }
      );
    }

    const parsed = updateCountrySchema.safeParse(body);
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

    const code = parsed.data.code === "" ? undefined : parsed.data.code;

    if (parsed.data.name) {
      const nameConflict = await prisma.country.findFirst({
        where: { name: parsed.data.name, NOT: { id: params.id } },
      });
      if (nameConflict) {
        return NextResponse.json(
          { error: { code: "CONFLICT", message: "Nombre ya en uso" } },
          { status: 409 }
        );
      }
    }
    if (code) {
      const codeConflict = await prisma.country.findFirst({
        where: { code, NOT: { id: params.id } },
      });
      if (codeConflict) {
        return NextResponse.json(
          { error: { code: "CONFLICT", message: "Código ya en uso" } },
          { status: 409 }
        );
      }
    }

    try {
      const country = await prisma.country.update({
        where: { id: params.id },
        data: {
          name: parsed.data.name,
          nationality: parsed.data.nationality,
          code,
        },
      });
      return NextResponse.json({ data: country });
    } catch {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "País no encontrado" } },
        { status: 404 }
      );
    }
  },
  { ownerOnly: true }
);

export const DELETE = withAuth<{ id: string }>(
  async (_req, { params }) => {
    try {
      await prisma.country.delete({ where: { id: params.id } });
      return new Response(null, { status: 204 });
    } catch {
      return NextResponse.json(
        {
          error: {
            code: "CONFLICT",
            message: "No se puede eliminar el país. Puede que tenga datos asociados.",
          },
        },
        { status: 409 }
      );
    }
  },
  { ownerOnly: true }
);
