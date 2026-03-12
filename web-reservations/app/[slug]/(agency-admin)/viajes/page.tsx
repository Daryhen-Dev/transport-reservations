import { auth } from "@/auth";
import { getTrips } from "@/lib/services/trip.service";
import { getBranches } from "@/lib/services/branch.service";
import { getRoutes } from "@/lib/services/route.service";
import { getTripSchedules } from "@/lib/services/trip-schedule.service";
import { AgencySidebar } from "@/components/agency-sidebar";
import { TripsTable } from "./_components/trips-table";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function ViajesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  const user = {
    name: session?.user?.name ?? "",
    email: session?.user?.email ?? "",
  };

  const [trips, branches, routes, schedules] = await Promise.all([
    getTrips(),
    getBranches("agency_main"),
    getRoutes(),
    getTripSchedules(),
  ]);

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AgencySidebar variant="inset" slug={slug} user={user} />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <TripsTable data={trips} branches={branches} routes={routes} schedules={schedules} currentSlug={slug} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
