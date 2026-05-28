import { startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";
import { prisma } from "@/lib/db";

export type DashboardData = {
  today: {
    trips: number;
    tripsOpen: number;
    seatsReserved: number;
    pendingReservations: number;
    cargoItems: number;
  };
  thisWeek: {
    trips: number;
    confirmedReservations: number;
    pendingReservations: number;
    cancelledReservations: number;
    cargoItems: number;
    topRoutes: Array<{
      routeId: string;
      origin: string;
      destination: string;
      tripCount: number;
    }>;
  };
};

/** Single-query dashboard data scoped to a branch. */
export async function getDashboardData(branchId: string): Promise<DashboardData> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  // Semana: lunes a domingo
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const [
    todayTrips,
    todayTripsOpen,
    todaySeats,
    todayPendingReservations,
    todayCargo,
    weekTrips,
    weekConfirmedReservations,
    weekPendingReservations,
    weekCancelledReservations,
    weekCargo,
    weekTripsByRoute,
  ] = await Promise.all([
    // ── Hoy ────────────────────────────────────────────────────────────
    prisma.trip.count({
      where: { branchId, departureAt: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.trip.count({
      where: {
        branchId,
        departureAt: { gte: todayStart, lte: todayEnd },
        status: { name: "ABIERTO" },
      },
    }),
    prisma.passengerReservation.aggregate({
      _sum: { seatCount: true },
      where: {
        trip: { branchId, departureAt: { gte: todayStart, lte: todayEnd } },
        reservationStatus: { name: "CONFIRMADA" },
      },
    }),
    prisma.passengerReservation.count({
      where: {
        trip: { branchId, departureAt: { gte: todayStart, lte: todayEnd } },
        reservationStatus: { name: "PENDIENTE" },
      },
    }),
    prisma.cargoReservation.count({
      where: {
        trip: { branchId, departureAt: { gte: todayStart, lte: todayEnd } },
      },
    }),
    // ── Esta semana ────────────────────────────────────────────────────
    prisma.trip.count({
      where: { branchId, departureAt: { gte: weekStart, lte: weekEnd } },
    }),
    prisma.passengerReservation.count({
      where: {
        trip: { branchId, departureAt: { gte: weekStart, lte: weekEnd } },
        reservationStatus: { name: "CONFIRMADA" },
      },
    }),
    prisma.passengerReservation.count({
      where: {
        trip: { branchId, departureAt: { gte: weekStart, lte: weekEnd } },
        reservationStatus: { name: "PENDIENTE" },
      },
    }),
    prisma.passengerReservation.count({
      where: {
        trip: { branchId, departureAt: { gte: weekStart, lte: weekEnd } },
        reservationStatus: { name: "CANCELADA" },
      },
    }),
    prisma.cargoReservation.count({
      where: {
        trip: { branchId, departureAt: { gte: weekStart, lte: weekEnd } },
      },
    }),
    prisma.trip.groupBy({
      by: ["routeId"],
      where: { branchId, departureAt: { gte: weekStart, lte: weekEnd } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),
  ]);

  // Resolve route names for top routes
  const routes = await prisma.route.findMany({
    where: { id: { in: weekTripsByRoute.map((r) => r.routeId) } },
    select: { id: true, origin: true, destination: true },
  });
  const routeMap = new Map(routes.map((r) => [r.id, r]));

  return {
    today: {
      trips: todayTrips,
      tripsOpen: todayTripsOpen,
      seatsReserved: todaySeats._sum.seatCount ?? 0,
      pendingReservations: todayPendingReservations,
      cargoItems: todayCargo,
    },
    thisWeek: {
      trips: weekTrips,
      confirmedReservations: weekConfirmedReservations,
      pendingReservations: weekPendingReservations,
      cancelledReservations: weekCancelledReservations,
      cargoItems: weekCargo,
      topRoutes: weekTripsByRoute
        .map((g) => {
          const route = routeMap.get(g.routeId);
          if (!route) return null;
          return {
            routeId: g.routeId,
            origin: route.origin,
            destination: route.destination,
            tripCount: g._count.id,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null),
    },
  };
}
