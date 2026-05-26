import { prisma } from "@/lib/db";

export default async function DashboardPage() {
  const now = new Date();

  const [
    branchCount,
    userCount,
    upcomingTripsCount,
    passengerReservationCount,
    cargoReservationCount,
  ] = await Promise.all([
    prisma.branch.count(),
    prisma.user.count(),
    prisma.trip.count({
      where: { departureAt: { gte: now } },
    }),
    prisma.passengerReservation.count(),
    prisma.cargoReservation.count(),
  ]);

  const totalReservas = passengerReservationCount + cargoReservationCount;

  const stats = [
    { title: "Total sucursales", value: branchCount },
    { title: "Total usuarios", value: userCount },
    { title: "Próximos viajes", value: upcomingTripsCount },
    { title: "Total reservas", value: totalReservas },
  ];

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col gap-2"
          >
            <p className="text-sm text-muted-foreground">{stat.title}</p>
            <p className="text-4xl font-bold tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
