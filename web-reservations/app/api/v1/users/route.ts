import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { createUserSchema } from "@/lib/api/schemas/users";
import { auditCreateOnly } from "@/lib/api/audit";

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

export const GET = withAuth(
  async () => {
    const users = await prisma.user.findMany({
      select: SAFE_USER_SELECT,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ data: users });
  },
  { ownerOnly: true }
);

export const POST = withAuth(
  async (req, { auth }) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Invalid JSON" } },
        { status: 400 }
      );
    }
    const parsed = createUserSchema.safeParse(body);
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

    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });
    if (existing) {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "El email ya está en uso" } },
        { status: 409 }
      );
    }

    const role = await prisma.role.findUnique({
      where: { name: parsed.data.roleName },
    });
    if (!role) {
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL",
            message: `Rol ${parsed.data.roleName} no encontrado`,
          },
        },
        { status: 500 }
      );
    }

    // OWNER ignora branchId; SUCURSAL_USER requiere uno válido.
    let branchId: string | null = null;
    if (parsed.data.roleName === "SUCURSAL_USER") {
      const branch = await prisma.branch.findUnique({
        where: { id: parsed.data.branchId! },
        select: { id: true },
      });
      if (!branch) {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "Sucursal no encontrada" } },
          { status: 404 }
        );
      }
      branchId = branch.id;
    }

    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: await bcrypt.hash(parsed.data.password, 12),
        roleId: role.id,
        ...auditCreateOnly(auth.userId),
        branchId,
      },
      select: SAFE_USER_SELECT,
    });
    return NextResponse.json({ data: user }, { status: 201 });
  },
  { ownerOnly: true }
);
