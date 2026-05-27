import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, hashRefreshToken } from "@/lib/api/auth";

export async function DELETE(req: Request) {
  const authOrError = await requireAuth(req);
  if (authOrError instanceof NextResponse) return authOrError;
  const auth = authOrError;

  let body: { refreshToken?: string } = {};
  try {
    body = (await req.json()) as { refreshToken?: string };
  } catch {
    // Body is optional. Clients without a refresh token revoke all.
  }

  if (body.refreshToken) {
    const tokenHash = hashRefreshToken(body.refreshToken);
    await prisma.refreshToken.deleteMany({
      where: { tokenHash, userId: auth.userId },
    });
  } else {
    await prisma.refreshToken.deleteMany({ where: { userId: auth.userId } });
  }

  return new Response(null, { status: 204 });
}
