import { auth } from "@/auth";
import { getTripsCalendarData } from "@/lib/services/calendar.service";
import { AgencySidebar } from "@/components/agency-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { CalendarioView } from "./_components/calendario-view";

export default async function CalendarioPage({
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

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-based

  const calendarData = await getTripsCalendarData(year, month);

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
              <CalendarioView
                initialData={calendarData}
                initialYear={year}
                initialMonth={month}
              />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
