import { auth } from "@/auth";
import { getTripSchedules } from "@/lib/services/trip-schedule.service";
import { getRoutes } from "@/lib/services/route.service";
import { getBranches } from "@/lib/services/branch.service";
import { AgencySidebar } from "@/components/agency-sidebar";
import { SchedulesTable } from "./_components/schedules-table";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function HorariosPage({
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

  const [schedules, routes, branches] = await Promise.all([
    getTripSchedules(),
    getRoutes(),
    getBranches("agency_main"),
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
              <SchedulesTable data={schedules} routes={routes} branches={branches} currentSlug={slug} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
