import { jwtVerify, SignJWT } from "jose";
import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import type { AuthSession, MobileJwtPayload } from "./types";

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET!);

export async function requireAuth(
  req: Request
): Promise<AuthSession | NextResponse> {
  const authHeader = req.headers.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const { payload } = await jwtVerify(token, SECRET);
      const { id, role } = payload as { id: string; role: string };

      const user = await prisma.user.findUnique({
        where: { id },
        select: { branchId: true, agencyId: true, name: true, email: true },
      });
      if (!user)
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });

      return {
        userId: id,
        role,
        branchId: user.branchId,
        agencyId: user.agencyId,
        name: user.name,
        email: user.email,
      };
    } catch {
      return NextResponse.json(
        { error: "Token inválido o expirado" },
        { status: 401 }
      );
    }
  }

  // Fall back to NextAuth session cookie
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { branchId: true, agencyId: true, name: true, email: true },
  });
  if (!user)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  return {
    userId: session.user.id,
    role: session.user.role,
    branchId: user.branchId,
    agencyId: user.agencyId,
    name: session.user.name ?? user.name,
    email: session.user.email ?? user.email,
  };
}

export async function requireBranchAccess(
  req: Request,
  slug: string
): Promise<AuthSession | NextResponse> {
  const sessionOrError = await requireAuth(req);
  if (sessionOrError instanceof NextResponse) return sessionOrError;

  const session = sessionOrError;

  // SUPER_ADMIN: access to any branch
  if (session.role === "SUPER_ADMIN") return session;

  const branch = await prisma.branch.findUnique({ where: { slug } });
  if (!branch)
    return NextResponse.json(
      { error: "Sucursal no encontrada" },
      { status: 404 }
    );

  if (session.role === "AGENCY_ADMIN") {
    if (session.agencyId !== branch.agencyId) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }
    return session;
  }

  if (session.role === "SUCURSAL_USER") {
    if (session.branchId !== branch.id) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }
    return session;
  }

  return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
}

export async function signMobileJwt(payload: MobileJwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(SECRET);
}

export async function verifyMobileJwt(
  token: string
): Promise<AuthSession | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (!payload.id || !payload.role) return null;
    return {
      userId: payload.id as string,
      role: payload.role as string,
      agencyId: (payload.agencyId as string) ?? null,
      branchId: (payload.branchId as string) ?? null,
      name: (payload.name as string) ?? "",
      email: (payload.email as string) ?? "",
    };
  } catch {
    return null;
  }
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateRefreshToken(): string {
  return randomBytes(64).toString("hex");
}
