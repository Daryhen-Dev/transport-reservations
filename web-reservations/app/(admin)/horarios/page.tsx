import { getTripSchedules } from "@/lib/services/trip-schedule.service";
import { getRoutes } from "@/lib/services/route.service";
import { getBranches } from "@/lib/services/branch.service";
import { SchedulesTable } from "./_components/schedules-table";

export default async function HorariosPage() {
  const [schedules, routes, branches] = await Promise.all([
    getTripSchedules(),
    getRoutes(),
    getBranches(),
  ]);

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <SchedulesTable data={schedules} routes={routes} branches={branches} />
    </div>
  );
}
