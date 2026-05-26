import { requireActiveBranch } from "@/lib/branch-context";
import { getTripsCalendarData } from "@/lib/services/calendar.service";
import { CalendarioView } from "./_components/calendario-view";

export default async function CalendarioPage() {
  const branch = await requireActiveBranch();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-based

  const calendarData = await getTripsCalendarData(year, month, branch.id);

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <CalendarioView
        initialData={calendarData}
        initialYear={year}
        initialMonth={month}
      />
    </div>
  );
}
