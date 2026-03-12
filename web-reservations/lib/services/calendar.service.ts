import { prisma } from "@/lib/db";
import {
  startOfMonth,
  endOfMonth,
  format,
} from "date-fns";

export type CalendarDayStatus = {
  name: string;
  count: number;
  passengers: number;
  color: string;
};

export type CalendarReservation = {
  id: string;
  proveedorName: string;
  phone: string | null;
  seatCount: number;
  passengersEntered: number;
  statusName: string;
  statusColor: string;
};

// Per-trip summary used by MiniCalendar
export type CalendarTrip = {
  tripId: string;
  time: string; // "HH:MM"
  route: { origin: string; destination: string };
  totalPassengers: number;
  statuses: CalendarDayStatus[];
  reservations: CalendarReservation[];
};

export type CalendarDay = {
  date: string; // YYYY-MM-DD
  statuses: CalendarDayStatus[];   // day-level aggregate — used by BigCalendar
  totalPassengers: number;          // day-level total — used by BigCalendar
  trips: CalendarTrip[];            // per-trip breakdown — used by MiniCalendar
};

const STATUS_COLORS: Record<string, string> = {
  confirm: "green",
  pendient: "amber",
  cancel: "red",
};

function getColor(statusName: string): string {
  const lower = statusName.toLowerCase();
  for (const [key, color] of Object.entries(STATUS_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return "gray";
}

export async function getTripsCalendarData(
  year: number,
  month: number,
  branchId?: string
): Promise<CalendarDay[]> {
  const referenceDate = new Date(year, month - 1, 1);
  const start = startOfMonth(referenceDate);
  const end = endOfMonth(referenceDate);

  const trips = await prisma.trip.findMany({
    where: {
      departureAt: { gte: start, lte: end },
      ...(branchId ? { branchId } : {}),
    },
    include: {
      route: { select: { origin: true, destination: true } },
      passengerReservations: {
        select: {
          id: true,
          seatCount: true,
          _count: { select: { passengers: true } },
          reservationStatus: { select: { name: true } },
          proveedor: {
            select: {
              firstName: true,
              lastName: true,
              companyName: true,
              phone: true,
            },
          },
        },
      },
      cargoReservations: {
        include: {
          reservationStatus: { select: { name: true } },
        },
      },
    },
    orderBy: { departureAt: "asc" },
  });

  // Day-level aggregation (for BigCalendar)
  const dayMap = new Map<string, {
    statusMap: Map<string, { count: number; passengers: number }>;
    totalPassengers: number;
    trips: CalendarTrip[];
  }>();

  for (const trip of trips) {
    const dateKey = format(trip.departureAt, "yyyy-MM-dd");

    if (!dayMap.has(dateKey)) {
      dayMap.set(dateKey, { statusMap: new Map(), totalPassengers: 0, trips: [] });
    }
    const dayEntry = dayMap.get(dateKey)!;

    // ── Per-trip aggregation ───────────────────────────────
    const tripStatusMap = new Map<string, { count: number; passengers: number }>();
    let tripTotalPassengers = 0;
    const tripReservations: CalendarReservation[] = [];

    for (const r of trip.passengerReservations) {
      const name = r.reservationStatus.name;
      const isCancelled = name.toLowerCase().includes("cancel");

      // Day-level totals
      if (!isCancelled) dayEntry.totalPassengers += r.seatCount;
      const dayPrev = dayEntry.statusMap.get(name) ?? { count: 0, passengers: 0 };
      dayEntry.statusMap.set(name, { count: dayPrev.count + 1, passengers: dayPrev.passengers + r.seatCount });

      // Trip-level totals
      if (!isCancelled) tripTotalPassengers += r.seatCount;
      const tripPrev = tripStatusMap.get(name) ?? { count: 0, passengers: 0 };
      tripStatusMap.set(name, { count: tripPrev.count + 1, passengers: tripPrev.passengers + r.seatCount });

      const proveedorName = r.proveedor.firstName
        ? `${r.proveedor.firstName} ${r.proveedor.lastName ?? ""}`.trim()
        : (r.proveedor.companyName ?? "Sin nombre");

      tripReservations.push({
        id: r.id,
        proveedorName,
        phone: r.proveedor.phone,
        seatCount: r.seatCount,
        passengersEntered: r._count.passengers,
        statusName: name,
        statusColor: getColor(name),
      });
    }

    // Cargo only contributes to day-level status counts
    for (const r of trip.cargoReservations) {
      const name = r.reservationStatus.name;
      const prev = dayEntry.statusMap.get(name) ?? { count: 0, passengers: 0 };
      dayEntry.statusMap.set(name, { count: prev.count + 1, passengers: prev.passengers });
    }

    // Build trip statuses array
    const tripStatuses: CalendarDayStatus[] = [];
    for (const [name, { count, passengers }] of tripStatusMap.entries()) {
      if (count > 0) {
        tripStatuses.push({ name, count, passengers, color: getColor(name) });
      }
    }

    dayEntry.trips.push({
      tripId: trip.id,
      time: format(trip.departureAt, "HH:mm"),
      route: { origin: trip.route.origin, destination: trip.route.destination },
      totalPassengers: tripTotalPassengers,
      statuses: tripStatuses,
      reservations: tripReservations,
    });
  }

  // Build result array
  const result: CalendarDay[] = [];

  for (const [date, { statusMap, totalPassengers, trips: calendarTrips }] of dayMap.entries()) {
    const statuses: CalendarDayStatus[] = [];
    for (const [name, { count, passengers }] of statusMap.entries()) {
      if (count > 0) {
        statuses.push({ name, count, passengers, color: getColor(name) });
      }
    }
    result.push({ date, statuses, totalPassengers, trips: calendarTrips });
  }

  return result;
}
