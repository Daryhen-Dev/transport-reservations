import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import {
  signMobileJwt,
  generateRefreshToken,
  hashRefreshToken,
} from "@/lib/api/auth";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const ACCESS_TTL_SEC = 15 * 60;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON" } },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Invalid body",
          details: parsed.error.issues,
        },
      },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    include: { role: true },
  });
  if (!user) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Email o contraseña inválidos",
        },
      },
      { status: 401 }
    );
  }

  const passwordMatch = await bcrypt.compare(
    parsed.data.password,
    user.password
  );
  if (!passwordMatch) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Email o contraseña inválidos",
        },
      },
      { status: 401 }
    );
  }

  const accessToken = await signMobileJwt({
    id: user.id,
    role: user.role.name,
    branchId: user.branchId,
  });

  const refreshToken = generateRefreshToken();
  const refreshHash = hashRefreshToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

  await prisma.refreshToken.create({
    data: { tokenHash: refreshHash, userId: user.id, expiresAt },
  });

  return NextResponse.json(
    {
      data: {
        accessToken,
        refreshToken,
        expiresIn: ACCESS_TTL_SEC,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role.name,
          branchId: user.branchId,
        },
      },
    },
    { status: 200 }
  );
}
