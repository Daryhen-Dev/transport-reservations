import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import type { Branch } from "@/lib/generated/prisma/client";

const COOKIE_NAME = "active_branch_id";

export async function getActiveBranch(): Promise<Branch | null> {
  const session = await auth();
  if (!session?.user) return null;
  const sessionUser = session.user as {
    role?: string;
    branchId?: string | null;
  };
  const role = sessionUser.role ?? "";
  const userBranchId = sessionUser.branchId ?? null;

  if (role === "SUCURSAL_USER") {
    if (!userBranchId) return null;
    return prisma.branch.findUnique({ where: { id: userBranchId } });
  }

  // OWNER
  const cookieStore = await cookies();
  const cookieId = cookieStore.get(COOKIE_NAME)?.value;
  if (cookieId) {
    const branch = await prisma.branch.findUnique({ where: { id: cookieId } });
    if (branch) return branch;
  }
  const first = await prisma.branch.findFirst({ orderBy: { createdAt: "asc" } });
  return first ?? null;
}

export async function requireActiveBranch(): Promise<Branch> {
  const branch = await getActiveBranch();
  if (!branch) redirect("/sucursales");
  return branch;
}
