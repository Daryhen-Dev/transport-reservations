import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { requireAuth } from "@/lib/api/auth";
import { prisma } from "@/lib/db";

const bodySchema = z.object({ branchId: z.string().cuid() });
const COOKIE_NAME = "active_branch_id";
const ONE_MONTH_SECONDS = 60 * 60 * 24 * 30;

export async function POST(req: Request) {
  const ctx = await requireAuth(req);
  if (ctx instanceof NextResponse) return ctx;

  if (ctx.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const branch = await prisma.branch.findUnique({
    where: { id: parsed.data.branchId },
  });
  if (!branch) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  const store = await cookies();
  store.set(COOKIE_NAME, branch.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_MONTH_SECONDS,
  });

  return new Response(null, { status: 204 });
}

export async function DELETE(req: Request) {
  const ctx = await requireAuth(req);
  if (ctx instanceof NextResponse) return ctx;

  const store = await cookies();
  store.delete(COOKIE_NAME);
  return new Response(null, { status: 204 });
}
