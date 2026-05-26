import { auth } from "@/auth";
import { getPassengerReservationsByBranch, getCargoReservationsByBranch } from "@/lib/services/reservation.service";
import { getTrips } from "@/lib/services/trip.service";
import { AgencySidebar } from "@/components/agency-sidebar";
import { PassengerReservationsTable } from "./_components/passenger-reservations-table";
import { CargoReservationsTable } from "./_components/cargo-reservations-table";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { prisma } from "@/lib/db";

export default async function ReservasPage({
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

  const branch = await prisma.branch.findUnique({ where: { slug }, select: { id: true } });
  const branchId = branch?.id ?? "";

  const [
    passengerReservations,
    cargoReservations,
    trips,
    reservationStatuses,
    documentTypes,
    countries,
    proveedorTypes,
    categorias,
    branches,
  ] = await Promise.all([
    getPassengerReservationsByBranch(branchId),
    getCargoReservationsByBranch(branchId),
    getTrips(branchId),
    prisma.reservationStatus.findMany({ orderBy: { name: "asc" } }),
    prisma.documentType.findMany({ orderBy: { name: "asc" } }),
    prisma.country.findMany({ orderBy: { name: "asc" } }),
    prisma.proveedorType.findMany({ orderBy: { name: "asc" } }),
    prisma.cargaCategoria.findMany({ orderBy: { name: "asc" } }),
    prisma.branch.findMany({ orderBy: { name: "asc" } }),
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
      <AgencySidebar variant="inset" slug={slug} />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <h1 className="text-2xl font-semibold">Reservas</h1>
                <p className="text-sm text-muted-foreground">
                  Gestioná reservas de pasajeros y encomiendas
                </p>
              </div>
              <Tabs defaultValue="pasajeros" className="w-full">
                <div className="px-4 lg:px-6">
                  <TabsList>
                    <TabsTrigger value="pasajeros">
                      Pasajeros
                      {passengerReservations.length > 0 && (
                        <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                          {passengerReservations.length}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="encomiendas">
                      Encomiendas
                      {cargoReservations.length > 0 && (
                        <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                          {cargoReservations.length}
                        </span>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="pasajeros" className="mt-4">
                  <PassengerReservationsTable
                    data={passengerReservations}
                    trips={trips}
                    reservationStatuses={reservationStatuses}
                    documentTypes={documentTypes}
                    countries={countries}
                    proveedorTypes={proveedorTypes}
                    currentSlug={slug}
                  />
                </TabsContent>
                <TabsContent value="encomiendas" className="mt-4">
                  <CargoReservationsTable
                    data={cargoReservations}
                    trips={trips}
                    reservationStatuses={reservationStatuses}
                    documentTypes={documentTypes}
                    countries={countries}
                    proveedorTypes={proveedorTypes}
                    categorias={categorias}
                    branches={branches}
                    currentSlug={slug}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
