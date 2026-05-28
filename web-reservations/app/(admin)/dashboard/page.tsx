import {
  IconBus,
  IconUsers,
  IconClock,
  IconPackage,
  IconRoute,
  IconCircleCheck,
  IconX,
  IconLockOpen,
} from "@tabler/icons-react";
import Link from "next/link";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { requireActiveBranch } from "@/lib/branch-context";
import { getDashboardData } from "@/lib/services/dashboard.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function KpiCard({
  title,
  value,
  hint,
  icon,
  href,
}: {
  title: string;
  value: number | string;
  hint?: string;
  icon: React.ReactNode;
  href?: string;
}) {
  const card = (
    <Card className="transition-colors hover:bg-muted/40">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

export default async function DashboardPage() {
  const branch = await requireActiveBranch();
  const data = await getDashboardData(branch.id);

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  return (
    <div className="flex flex-col gap-6 py-4 md:gap-8 md:py-6 px-4 lg:px-6">
      {/* ── Hoy ─────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <header className="flex items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold uppercase tracking-wide text-muted-foreground">
            Hoy
          </h2>
          <span className="text-xs text-muted-foreground">
            {format(now, "EEEE d 'de' MMMM", { locale: es })} · {branch.name}
          </span>
        </header>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard
            title="Viajes hoy"
            value={data.today.trips}
            hint={`${data.today.tripsOpen} abierto(s)`}
            icon={<IconBus className="size-4" />}
            href="/viajes"
          />
          <KpiCard
            title="Asientos vendidos"
            value={data.today.seatsReserved}
            hint="Reservas confirmadas"
            icon={<IconUsers className="size-4" />}
            href="/reservas"
          />
          <KpiCard
            title="Reservas pendientes"
            value={data.today.pendingReservations}
            hint="Por confirmar"
            icon={<IconClock className="size-4" />}
            href="/reservas"
          />
          <KpiCard
            title="Encomiendas"
            value={data.today.cargoItems}
            hint="Total del día"
            icon={<IconPackage className="size-4" />}
            href="/encomiendas"
          />
          <KpiCard
            title="Viajes abiertos"
            value={data.today.tripsOpen}
            hint="Aceptan reservas"
            icon={<IconLockOpen className="size-4" />}
            href="/viajes"
          />
        </div>
      </section>

      {/* ── Esta semana ────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <header className="flex items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold uppercase tracking-wide text-muted-foreground">
            Esta semana
          </h2>
          <span className="text-xs text-muted-foreground">
            {format(weekStart, "d MMM", { locale: es })} —{" "}
            {format(weekEnd, "d MMM", { locale: es })}
          </span>
        </header>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="Viajes totales"
            value={data.thisWeek.trips}
            icon={<IconBus className="size-4" />}
            href="/viajes"
          />
          <KpiCard
            title="Reservas confirmadas"
            value={data.thisWeek.confirmedReservations}
            icon={<IconCircleCheck className="size-4 text-green-600" />}
            href="/reservas"
          />
          <KpiCard
            title="Reservas pendientes"
            value={data.thisWeek.pendingReservations}
            icon={<IconClock className="size-4 text-amber-500" />}
            href="/reservas"
          />
          <KpiCard
            title="Reservas canceladas"
            value={data.thisWeek.cancelledReservations}
            icon={<IconX className="size-4 text-destructive" />}
            href="/reservas"
          />
        </div>

        {/* Top rutas */}
        <Card className="mt-2">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <IconRoute className="size-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">
                Top rutas de la semana
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {data.thisWeek.topRoutes.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Sin viajes en la semana.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th className="text-left font-medium pb-2">Ruta</th>
                    <th className="text-right font-medium pb-2">Viajes</th>
                  </tr>
                </thead>
                <tbody>
                  {data.thisWeek.topRoutes.map((r) => (
                    <tr key={r.routeId} className="border-t">
                      <td className="py-2">
                        {r.origin} → {r.destination}
                      </td>
                      <td className="py-2 text-right font-medium">
                        {r.tripCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
