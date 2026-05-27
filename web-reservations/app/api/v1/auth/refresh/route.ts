import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  signMobileJwt,
  generateRefreshToken,
  hashRefreshToken,
} from "@/lib/api/auth";

const bodySchema = z.object({
  refreshToken: z.string().min(1),
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
      { error: { code: "BAD_REQUEST", message: "Invalid body" } },
      { status: 400 }
    );
  }

  const tokenHash = hashRefreshToken(parsed.data.refreshToken);

  const result = await prisma.$transaction(async (tx) => {
    const row = await tx.refreshToken.findUnique({ where: { tokenHash } });
    if (!row || row.expiresAt < new Date()) return null;

    const user = await tx.user.findUnique({
      where: { id: row.userId },
      include: { role: true },
    });
    if (!user) return null;

    // Hard-delete the old refresh row (rotation per AD4)
    await tx.refreshToken.delete({ where: { id: row.id } });

    // Issue a new pair
    const newRefresh = generateRefreshToken();
    const newRefreshHash = hashRefreshToken(newRefresh);
    const newExpiresAt = new Date(Date.now() + REFRESH_TTL_MS);
    await tx.refreshToken.create({
      data: {
        tokenHash: newRefreshHash,
        userId: user.id,
        expiresAt: newExpiresAt,
      },
    });

    return { newRefresh, user };
  });

  if (!result) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_TOKEN",
          message: "Refresh token inválido o expirado",
        },
      },
      { status: 401 }
    );
  }

  const accessToken = await signMobileJwt({
    id: result.user.id,
    role: result.user.role.name,
    branchId: result.user.branchId,
  });

  return NextResponse.json(
    {
      data: {
        accessToken,
        refreshToken: result.newRefresh,
        expiresIn: ACCESS_TTL_SEC,
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role.name,
          branchId: result.user.branchId,
        },
      },
    },
    { status: 200 }
  );
}
