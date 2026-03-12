"use server";

import { getTripsCalendarData, type CalendarDay } from "@/lib/services/calendar.service";

export async function fetchCalendarData(
  year: number,
  month: number,
  branchId?: string
): Promise<CalendarDay[]> {
  return getTripsCalendarData(year, month, branchId);
}
