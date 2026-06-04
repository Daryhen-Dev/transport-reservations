import { requireActiveBranch } from "@/lib/branch-context";
import { getTrips } from "@/lib/services/trip.service";
import { getBranches } from "@/lib/services/branch.service";
import { getRoutes } from "@/lib/services/route.service";
import { getTripSchedules } from "@/lib/services/trip-schedule.service";
import { prisma } from "@/lib/db";
import { TripsTable } from "./_components/trips-table";

export default async function ViajesPage() {
  const branch = await requireActiveBranch();

  const [trips, branches, routes, schedules, crewRoles, documentTypes] =
    await Promise.all([
      getTrips(branch.id),
      getBranches(),
      getRoutes(),
      getTripSchedules(),
      prisma.crewRole.findMany({ orderBy: { name: "asc" } }),
      prisma.documentType.findMany({ orderBy: { name: "asc" } }),
    ]);

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <TripsTable
        data={trips}
        branches={branches}
        routes={routes}
        schedules={schedules}
        crewRoles={crewRoles}
        documentTypes={documentTypes}
      />
    </div>
  );
}
