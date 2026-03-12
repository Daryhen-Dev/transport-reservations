"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { useRouter, useParams } from "next/navigation";
import { fetchCalendarData } from "@/app/actions/calendar";
import type { CalendarDay } from "@/lib/services/calendar.service";
import { MiniCalendar } from "./mini-calendar";
import { BigCalendar } from "./big-calendar";

type Props = {
  initialData: CalendarDay[];
  initialYear: number;
  initialMonth: number;
};

export function CalendarioView({ initialData, initialYear, initialMonth }: Props) {
  const [data, setData] = useState<CalendarDay[]>(initialData);
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [, startTransition] = useTransition();
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  function handleMonthChange(newYear: number, newMonth: number) {
    setYear(newYear);
    setMonth(newMonth);
    startTransition(async () => {
      const newData = await fetchCalendarData(newYear, newMonth);
      setData(newData);
    });
  }

  function handleDateSelect(date: string) {
    setSelectedDate(date);

    // If selecting a date outside the currently displayed month, navigate there
    const [y, m] = date.split("-").map(Number);
    if (y !== year || m !== month) {
      handleMonthChange(y, m);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-[280px_1fr] lg:px-6">
      {/* Left panel — Mini calendar + day summary */}
      <MiniCalendar
        data={data}
        month={month}
        year={year}
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        onMonthChange={handleMonthChange}
      />

      {/* Right panel — Big month calendar */}
      <BigCalendar
        data={data}
        month={month}
        year={year}
        onMonthChange={handleMonthChange}
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        onDoubleClick={(date) => router.push(`/${slug}/reservas-pasajeros/nueva?fecha=${date}`)}
      />
    </div>
  );
}
