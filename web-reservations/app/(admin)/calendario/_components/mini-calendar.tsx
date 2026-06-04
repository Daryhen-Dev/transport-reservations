"use client";

import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { startOfDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { IconCircleCheck, IconAlertTriangle, IconCircleX, IconUserPlus, IconPackage } from "@tabler/icons-react";
import Link from "next/link";
import type { CalendarDay, CalendarReservation, CalendarTrip, CalendarCargoReservation } from "@/lib/services/calendar.service";
import { formatDateForInput, formatDateWithWeekday } from "@/lib/format-date";

const STATUS_CLASSES: Record<string, string> = {
  green: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  red: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  gray: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const DOT_CLASSES: Record<string, string> = {
  green: "bg-green-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  gray: "bg-gray-400",
};

function PassengerIndicator({ r, slug }: { r: CalendarReservation; slug: string }) {
  const hasPending = r.passengersEntered < r.seatCount;

  if (r.passengersEntered === r.seatCount && r.seatCount > 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
        <IconCircleCheck className="size-3.5" />
        {r.passengersEntered}/{r.seatCount} pasajeros ingresados
      </span>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <span className={cn(
        "flex items-center gap-1 text-xs",
        r.passengersEntered > 0
          ? "text-amber-600 dark:text-amber-400"
          : "text-muted-foreground/70"
      )}>
        {r.passengersEntered > 0
          ? <IconAlertTriangle className="size-3.5" />
          : <IconCircleX className="size-3.5" />
        }
        {r.passengersEntered > 0
          ? `${r.passengersEntered}/${r.seatCount} pasajeros ingresados`
          : "Sin pasajeros ingresados"
        }
      </span>
      {hasPending && (
        <Link
          href={`/reservas/${r.id}`}
          className="flex shrink-0 items-center gap-1 rounded-md bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <IconUserPlus className="size-3" />
          Ingresar
        </Link>
      )}
    </div>
  );
}

function CargoItem({ r }: { r: CalendarCargoReservation }) {
  return (
    <div className="flex items-start gap-2">
      <span
        className={cn(
          "mt-1 size-2 shrink-0 rounded-full",
          DOT_CLASSES[r.statusColor] ?? DOT_CLASSES.gray
        )}
      />
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-medium">{r.destinatarioName}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{r.weightKg} kg</span>
        </div>
        <div className="flex items-center gap-1.5">
          {r.categoriaName && (
            <span className="text-xs text-muted-foreground">{r.categoriaName}</span>
          )}
          <span
            className={cn(
              "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium",
              STATUS_CLASSES[r.statusColor] ?? STATUS_CLASSES.gray
            )}
          >
            {r.statusName.toLowerCase()}
          </span>
        </div>
      </div>
    </div>
  );
}

function TripPanel({ trip, slug }: { trip: CalendarTrip; slug: string }) {
  const hasCargo = trip.cargoReservations.length > 0;

  return (
    <div className="flex flex-col gap-2">
      {/* Trip header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-semibold tabular-nums">
            {trip.time}
          </span>
          <span className="truncate text-xs font-medium">
            {trip.route.origin} → {trip.route.destination}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {trip.totalPassengers > 0 && (
            <span className="text-xs text-muted-foreground">{trip.totalPassengers} pax</span>
          )}
          {hasCargo && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <IconPackage className="size-3" />
              {trip.cargoReservations.length}
            </span>
          )}
        </div>
      </div>

      {/* Status pills */}
      {trip.statuses.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {trip.statuses.map((s) => (
            <span
              key={s.name}
              className={cn(
                "inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium",
                STATUS_CLASSES[s.color] ?? STATUS_CLASSES.gray
              )}
            >
              ● {s.count} {s.name.toLowerCase()} · {s.passengers} pax
            </span>
          ))}
        </div>
      )}

      {/* Passenger reservation list */}
      {trip.reservations.length > 0 && (
        <div className="flex flex-col gap-2 pl-1">
          {trip.reservations.map((r) => (
            <div key={r.id} className="flex items-start gap-2">
              <span
                className={cn(
                  "mt-1 size-2 shrink-0 rounded-full",
                  DOT_CLASSES[r.statusColor] ?? DOT_CLASSES.gray
                )}
              />
              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium">{r.proveedorName}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">· {r.seatCount} pax</span>
                </div>
                {r.phone ? (
                  <span className="text-xs text-muted-foreground">{r.phone}</span>
                ) : (
                  <span className="text-xs italic text-muted-foreground/60">Sin teléfono</span>
                )}
                <PassengerIndicator r={r} slug={slug} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cargo reservation list */}
      {hasCargo && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <IconPackage className="size-3 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              Encomiendas · {trip.totalWeightKg.toFixed(1)} kg total
            </span>
          </div>
          <div className="flex flex-col gap-2 pl-1">
            {trip.cargoReservations.map((r) => (
              <CargoItem key={r.id} r={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type Props = {
  data: CalendarDay[];
  month: number; // 1-based
  year: number;
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
  onMonthChange: (year: number, month: number) => void;
  currentSlug?: string;
};

export function MiniCalendar({
  data,
  month,
  year,
  selectedDate,
  onDateSelect,
  onMonthChange,
  currentSlug,
}: Props) {
  const dataByDate = new Map(data.map((d) => [d.date, d]));
  const today = startOfDay(new Date());

  const selectedValue = selectedDate ? parseISO(selectedDate) : undefined;
  const currentMonth = new Date(year, month - 1, 1);

  const selectedDay = selectedDate ? dataByDate.get(selectedDate) : undefined;
  const selectedTrips = selectedDay?.trips ?? [];

  const formattedDate = selectedDate ? formatDateWithWeekday(selectedDate) : null;

  function handleSelect(date: Date | undefined) {
    if (!date) return;
    onDateSelect(formatDateForInput(date));
  }

  function handleMonthChange(date: Date) {
    onMonthChange(date.getFullYear(), date.getMonth() + 1);
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <Calendar
        mode="single"
        selected={selectedValue}
        onSelect={handleSelect}
        month={currentMonth}
        onMonthChange={handleMonthChange}
        disabled={(date) => startOfDay(date) < today}
        locale={es}
      />

      {/* Day Summary */}
      {formattedDate && (
        <div className="flex flex-col gap-3 border-t pt-3">
          <p className="text-xs font-medium capitalize text-muted-foreground">
            {formattedDate}
          </p>

          {selectedTrips.length === 0 ? (
            <p className="text-xs italic text-muted-foreground/70">Sin viajes</p>
          ) : (
            <div className="flex flex-col gap-4">
              {selectedTrips.map((trip, i) => (
                <div key={trip.tripId}>
                  {i > 0 && <Separator className="mb-4" />}
                  <TripPanel trip={trip} slug={currentSlug ?? ""} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
