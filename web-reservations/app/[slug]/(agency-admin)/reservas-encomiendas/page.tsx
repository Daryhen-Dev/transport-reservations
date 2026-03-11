import { auth } from "@/auth";
import { getCargoReservations } from "@/lib/services/reservation.service";
import { getTrips } from "@/lib/services/trip.service";
import { AgencySidebar } from "@/components/agency-sidebar";
import { CargoReservationsTable } from "./_components/cargo-reservations-table";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { prisma } from "@/lib/db";

export default async function ReservasEncomiendas({
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

  const [reservations, trips, reservationStatuses, documentTypes, countries, customerTypes] =
    await Promise.all([
      getCargoReservations(),
      getTrips(),
      prisma.reservationStatus.findMany({ orderBy: { name: "asc" } }),
      prisma.documentType.findMany({ orderBy: { name: "asc" } }),
      prisma.country.findMany({ orderBy: { name: "asc" } }),
      prisma.customerType.findMany({ orderBy: { name: "asc" } }),
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
              <CargoReservationsTable
                data={reservations}
                trips={trips}
                reservationStatuses={reservationStatuses}
                documentTypes={documentTypes}
                countries={countries}
                customerTypes={customerTypes}
                currentSlug={slug}
              />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
