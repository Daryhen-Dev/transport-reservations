import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/with-auth";
import { getTripsCalendarData } from "@/lib/services/calendar.service";

const querySchema = z.object({
  year: z.coerce.number().int().min(2000).max(3000),
  month: z.coerce.number().int().min(1).max(12),
  branchId: z.string().cuid().optional(),
});

export const GET = withAuth(async (req) => {
  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    year: url.searchParams.get("year"),
    month: url.searchParams.get("month"),
    branchId: url.searchParams.get("branchId") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid query" } },
      { status: 400 }
    );
  }
  const data = await getTripsCalendarData(
    parsed.data.year,
    parsed.data.month,
    parsed.data.branchId
  );
  return NextResponse.json({ data });
});
