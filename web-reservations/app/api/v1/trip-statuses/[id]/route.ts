import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { updateTripStatusSchema } from "@/lib/api/schemas/trip-statuses";

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
    const parsed = updateTripStatusSchema.safeParse(body);
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

    if (parsed.data.name) {
      const conflict = await prisma.tripStatus.findFirst({
        where: { name: parsed.data.name, NOT: { id: params.id } },
      });
      if (conflict) {
        return NextResponse.json(
          { error: { code: "CONFLICT", message: "Ya existe un estado con ese nombre" } },
          { status: 409 }
        );
      }
    }

    try {
      const status = await prisma.tripStatus.update({
        where: { id: params.id },
        data: parsed.data,
      });
      return NextResponse.json({ data: status });
    } catch {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Estado no encontrado" } },
        { status: 404 }
      );
    }
  },
  { ownerOnly: true }
);

export const DELETE = withAuth<{ id: string }>(
  async (_req, { params }) => {
    const status = await prisma.tripStatus.findUnique({
      where: { id: params.id },
      include: { _count: { select: { trips: true } } },
    });
    if (!status) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Estado no encontrado" } },
        { status: 404 }
      );
    }
    if (status._count.trips > 0) {
      return NextResponse.json(
        {
          error: {
            code: "CONFLICT",
            message: `No se puede eliminar: ${status._count.trips} viaje(s) usan este estado`,
          },
        },
        { status: 409 }
      );
    }

    await prisma.tripStatus.delete({ where: { id: params.id } });
    return new Response(null, { status: 204 });
  },
  { ownerOnly: true }
);
