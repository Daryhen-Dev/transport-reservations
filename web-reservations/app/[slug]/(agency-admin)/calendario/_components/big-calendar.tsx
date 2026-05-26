"use client";

import { cn } from "@/lib/utils";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isToday,
  isPast,
  startOfDay,
  format,
} from "date-fns";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import type { CalendarDay } from "@/lib/services/calendar.service";

const STATUS_CLASSES: Record<string, string> = {
  green: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  red: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  gray: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const TRIP_BORDER_CLASSES: Record<string, string> = {
  green: "border-l-green-500",
  amber: "border-l-amber-500",
  red: "border-l-red-500",
  gray: "border-l-gray-400",
};

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

type Props = {
  data: CalendarDay[];
  month: number; // 1-based
  year: number;
  onMonthChange: (year: number, month: number) => void;
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
  onDoubleClick?: (date: string) => void;
};

export function BigCalendar({
  data,
  month,
  year,
  onMonthChange,
  selectedDate,
  onDateSelect,
  onDoubleClick,
}: Props) {
  const { state } = useSidebar();
  const sidebarCollapsed = state === "collapsed";
  const dataByDate = new Map(data.map((d) => [d.date, d]));

  const firstDay = startOfMonth(new Date(year, month - 1, 1));
  const lastDay = endOfMonth(firstDay);
  const gridStart = startOfWeek(firstDay, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(lastDay, { weekStartsOn: 0 });

  const days: Date[] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  // Always show 6 rows × 7 = 42 cells
  while (days.length < 42) {
    days.push(addDays(days[days.length - 1], 1));
  }

  function prevMonth() {
    if (month === 1) onMonthChange(year - 1, 12);
    else onMonthChange(year, month - 1);
  }

  function nextMonth() {
    if (month === 12) onMonthChange(year + 1, 1);
    else onMonthChange(year, month + 1);
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <Button variant="outline" size="icon" onClick={prevMonth} className="size-8">
          <IconChevronLeft className="size-4" />
        </Button>
        <h2 className="text-base font-semibold">
          {MONTH_NAMES[month - 1]} {year}
        </h2>
        <Button variant="outline" size="icon" onClick={nextMonth} className="size-8">
          <IconChevronRight className="size-4" />
        </Button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b pb-2">
        {DAY_NAMES.map((name) => (
          <div
            key={name}
            className="text-center text-xs font-medium text-muted-foreground"
          >
            {name}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const isCurrentMonth = isSameMonth(day, firstDay);
          const isCurrentDay = isToday(day);
          const isPastDay = isPast(startOfDay(day)) && !isCurrentDay;
          const isSelected = dateKey === selectedDate;
          const dayData = dataByDate.get(dateKey);
          const statuses = dayData?.statuses ?? [];
          const totalPassengers = dayData?.totalPassengers ?? 0;
          const trips = dayData?.trips ?? [];

          return (
            <Button
              key={dateKey}
              variant="ghost"
              onClick={() => onDateSelect(dateKey)}
              onDoubleClick={() => !isPastDay && onDoubleClick?.(dateKey)}
              className={cn(
                "relative h-auto min-h-[80px] flex-col items-start justify-start gap-1 rounded-lg border border-border p-1.5 text-left transition-colors",
                !isCurrentMonth && "opacity-40",
                isPastDay && "opacity-60",
                isCurrentDay && "border-primary ring-1 ring-primary",
                isSelected && "bg-accent hover:bg-accent",
                !isSelected && "hover:bg-muted/50"
              )}
            >
              {/* Top: día + total pax */}
              <div className="flex w-full items-center justify-between">
                <span
                  className={cn(
                    "inline-flex size-6 items-center justify-center rounded-full text-xs font-medium",
                    isCurrentDay && "bg-primary text-primary-foreground font-semibold"
                  )}
                >
                  {day.getDate()}
                </span>
                {totalPassengers > 0 && (
                  <span className="text-xs font-medium text-muted-foreground">
                    {totalPassengers} pax
                  </span>
                )}
              </div>

              {/* Trips / status area */}
              <div className="flex w-full flex-col gap-0.5">
                {trips.length > 0 ? (
                  <>
                    {trips.slice(0, 2).map((trip) => {
                      const activeStatuses = trip.statuses.filter((s) => s.color !== "red");
                      return (
                        <div key={trip.tripId} className="flex flex-col gap-0.5">
                          {/* Time + total active pax */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold tabular-nums leading-tight">
                              {trip.time}
                            </span>
                            {trip.totalPassengers > 0 && (
                              <span className="text-xs font-medium leading-tight">
                                {trip.totalPassengers} pax
                              </span>
                            )}
                          </div>
                          {/* Confirmed + pending pills */}
                          {activeStatuses.map((s) => (
                            <span
                              key={s.name}
                              className={cn(
                                "truncate rounded px-1 py-0.5 text-xs leading-tight",
                                STATUS_CLASSES[s.color] ?? STATUS_CLASSES.gray
                              )}
                            >
                              ● {s.passengers} pax {s.name.toLowerCase()}
                            </span>
                          ))}
                        </div>
                      );
                    })}
                    {trips.length > 2 && (
                      <span className="text-xs text-muted-foreground">
                        +{trips.length - 2} más
                      </span>
                    )}
                  </>
                ) : (
                  statuses.map((s) => (
                    <span
                      key={s.name}
                      className={cn(
                        "truncate rounded px-1.5 py-0.5 text-xs font-medium leading-tight",
                        STATUS_CLASSES[s.color] ?? STATUS_CLASSES.gray
                      )}
                    >
                      ● {s.count} {s.name.toLowerCase()}
                      {sidebarCollapsed && s.passengers > 0 && (
                        <> · {s.passengers} pax</>
                      )}
                    </span>
                  ))
                )}
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
