import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { updateUserSchema } from "@/lib/api/schemas/users";

const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  branchId: true,
  createdAt: true,
  updatedAt: true,
  branch: { select: { id: true, name: true, slug: true } },
  role: { select: { id: true, name: true } },
} as const;

export const GET = withAuth<{ id: string }>(
  async (_req, { params }) => {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: SAFE_USER_SELECT,
    });
    if (!user) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Usuario no encontrado" } },
        { status: 404 }
      );
    }
    return NextResponse.json({ data: user });
  },
  { ownerOnly: true }
);

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
    const parsed = updateUserSchema.safeParse(body);
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

    if (parsed.data.email) {
      const existing = await prisma.user.findFirst({
        where: { email: parsed.data.email, NOT: { id: params.id } },
      });
      if (existing) {
        return NextResponse.json(
          { error: { code: "CONFLICT", message: "El email ya está en uso" } },
          { status: 409 }
        );
      }
    }

    const data: {
      name?: string;
      email?: string;
      password?: string;
      branchId?: string;
    } = {};
    if (parsed.data.name) data.name = parsed.data.name;
    if (parsed.data.email) data.email = parsed.data.email;
    if (parsed.data.password) data.password = await bcrypt.hash(parsed.data.password, 12);
    if (parsed.data.branchId) data.branchId = parsed.data.branchId;

    try {
      const user = await prisma.user.update({
        where: { id: params.id },
        data,
        select: SAFE_USER_SELECT,
      });
      return NextResponse.json({ data: user });
    } catch {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Usuario no encontrado" } },
        { status: 404 }
      );
    }
  },
  { ownerOnly: true }
);

export const DELETE = withAuth<{ id: string }>(
  async (_req, { params }) => {
    const target = await prisma.user.findUnique({
      where: { id: params.id },
      include: { role: { select: { name: true } } },
    });
    if (!target) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Usuario no encontrado" } },
        { status: 404 }
      );
    }

    // Prevent deletion of the last OWNER (avoid lockout)
    if (target.role.name === "OWNER") {
      const ownerCount = await prisma.user.count({
        where: { role: { name: "OWNER" } },
      });
      if (ownerCount <= 1) {
        return NextResponse.json(
          {
            error: {
              code: "CONFLICT",
              message: "No se puede eliminar el último OWNER del sistema",
            },
          },
          { status: 409 }
        );
      }
    }

    try {
      await prisma.user.delete({ where: { id: params.id } });
      return new Response(null, { status: 204 });
    } catch {
      return NextResponse.json(
        {
          error: {
            code: "CONFLICT",
            message: "No se puede eliminar el usuario. Puede que tenga datos asociados.",
          },
        },
        { status: 409 }
      );
    }
  },
  { ownerOnly: true }
);
