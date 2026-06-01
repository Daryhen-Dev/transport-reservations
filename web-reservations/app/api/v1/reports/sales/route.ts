import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { getSalesReport } from "@/lib/services/sales-report.service";

export const GET = withAuth(async (req, { auth }) => {
  const url = new URL(req.url);
  const branchIdParam = url.searchParams.get("branchId") ?? undefined;
  const fromParam = url.searchParams.get("from") ?? undefined;
  const toParam = url.searchParams.get("to") ?? undefined;

  // SUCURSAL_USER siempre limitado a su propia sucursal
  const branchId =
    auth.role === "SUCURSAL_USER" ? auth.branchId ?? undefined : branchIdParam;

  const from = fromParam ? new Date(fromParam) : undefined;
  const to = toParam ? new Date(toParam) : undefined;

  if ((fromParam && Number.isNaN(from?.getTime())) ||
      (toParam && Number.isNaN(to?.getTime()))) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Fecha inválida" } },
      { status: 400 }
    );
  }

  const report = await getSalesReport({ branchId, from, to });
  return NextResponse.json({ data: report });
});
