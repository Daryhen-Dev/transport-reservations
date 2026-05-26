import { auth } from "@/auth";
import { AgencySidebar } from "@/components/agency-sidebar";
import { TripStatusTable } from "./_components/trip-status-table";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { prisma } from "@/lib/db";

export default async function EstadosViajePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await auth();

  const statuses = await prisma.tripStatus.findMany({
    include: { _count: { select: { trips: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AgencySidebar variant="inset" slug={slug} />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <h1 className="text-2xl font-semibold">Estados de Viaje</h1>
                <p className="text-sm text-muted-foreground">
                  Administrá los estados disponibles para los viajes
                </p>
              </div>
              <TripStatusTable data={statuses} currentSlug={slug} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
