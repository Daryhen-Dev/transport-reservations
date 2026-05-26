import { prisma } from "@/lib/db";
import { TripStatusTable } from "./_components/trip-status-table";

export default async function EstadosViajePage() {
  const statuses = await prisma.tripStatus.findMany({
    include: { _count: { select: { trips: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <h1 className="text-2xl font-semibold">Estados de Viaje</h1>
        <p className="text-sm text-muted-foreground">
          Administrá los estados disponibles para los viajes
        </p>
      </div>
      <TripStatusTable data={statuses} />
    </div>
  );
}
