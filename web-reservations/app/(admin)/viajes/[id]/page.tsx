import { auth } from "@/auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  IconArrowLeft,
  IconAnchor,
  IconUsers,
  IconPackage,
  IconRoute,
  IconCalendar,
  IconClock,
  IconBuilding,
  IconFileCheck,
} from "@tabler/icons-react";
import { getTripDetail } from "@/lib/services/trip.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

function formatDateTime(d: Date | string): string {
  return new Date(d).toLocaleString("es-AR", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(d: Date | string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-AR", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function proveedorDisplay(p: {
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
}): string {
  return (
    p.companyName ??
    `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() ??
    "Sin nombre"
  );
}

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const userBranchId = (session?.user as { branchId?: string | null } | undefined)?.branchId ?? null;

  const trip = await getTripDetail(id);
  if (!trip) notFound();

  // SUCURSAL_USER may only view trips on their own branch.
  if (role === "SUCURSAL_USER" && trip.branchId !== userBranchId) {
    notFound();
  }

  const isClosed = trip.status.name === "CERRADO";
  const totalSeats = trip.passengerReservations.reduce(
    (sum, r) => sum + r.seatCount,
    0
  );
  const totalLinkedPassengers = trip.passengerReservations.reduce(
    (sum, r) => sum + r.passengers.length,
    0
  );
  const totalCargo = trip.cargoReservations.length;

  return (
    <div className="flex flex-col gap-6 px-4 py-4 md:gap-8 md:py-6 lg:px-6">
      {/* Back nav */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/viajes" className="gap-1.5">
            <IconArrowLeft className="size-4" />
            Volver a viajes
          </Link>
        </Button>
      </div>

      {/* Header card — main trip summary */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <IconRoute className="size-5 text-muted-foreground" />
              <CardTitle className="text-xl">
                {trip.route.origin} → {trip.route.destination}
              </CardTitle>
              <Badge variant={isClosed ? "secondary" : "outline"}>
                {trip.status.name}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              ID: <span className="font-mono">{trip.id}</span>
            </p>
          </div>
          {trip.manifest && (
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Manifiesto
              </span>
              <Badge variant="secondary" className="font-mono">
                <IconFileCheck className="size-3.5 mr-1" />
                {trip.manifest.code}
              </Badge>
            </div>
          )}
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Detail icon={<IconCalendar className="size-4" />} label="Salida">
            {formatDateTime(trip.departureAt)}
          </Detail>
          <Detail icon={<IconClock className="size-4" />} label="Horario">
            {trip.schedule ? trip.schedule.time : <span className="text-muted-foreground/70">Sin horario asignado</span>}
          </Detail>
          <Detail icon={<IconBuilding className="size-4" />} label="Sucursal">
            {trip.branch.name}
          </Detail>
          <Detail icon={<IconAnchor className="size-4" />} label="Tripulación">
            {trip.crew.length} {trip.crew.length === 1 ? "asignado" : "asignados"}
          </Detail>
        </CardContent>
      </Card>

      {/* Crew section */}
      <section className="flex flex-col gap-3">
        <header className="flex items-center gap-2">
          <IconAnchor className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Tripulación ({trip.crew.length})
          </h2>
        </header>
        {trip.crew.length === 0 ? (
          <p className="text-sm text-muted-foreground italic px-1">
            Sin tripulación asignada.
          </p>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Rol</th>
                  <th className="text-left px-4 py-2 font-medium">Nombre</th>
                  <th className="text-left px-4 py-2 font-medium">Documento</th>
                  <th className="text-left px-4 py-2 font-medium">Teléfono</th>
                </tr>
              </thead>
              <tbody>
                {trip.crew.map((c) => (
                  <tr key={c.crewMemberId} className="border-t">
                    <td className="px-4 py-2 font-medium">{c.crewRole.name}</td>
                    <td className="px-4 py-2">
                      {c.crewMember.firstName} {c.crewMember.lastName}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground text-xs">
                      {c.crewMember.documentType.name} · {c.crewMember.documentNumber}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {c.crewMember.phone ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Passenger reservations section */}
      <section className="flex flex-col gap-3">
        <header className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <IconUsers className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Pasajeros ({trip.passengerReservations.length} reserva{trip.passengerReservations.length === 1 ? "" : "s"})
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">
            {totalSeats} asiento(s) reservados · {totalLinkedPassengers} pasajero(s) registrado(s)
          </span>
        </header>
        {trip.passengerReservations.length === 0 ? (
          <p className="text-sm text-muted-foreground italic px-1">
            Sin reservas de pasajeros.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {trip.passengerReservations.map((r) => (
              <Card key={r.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{proveedorDisplay(r.proveedor)}</span>
                      <Badge variant="outline" className="text-xs">
                        {r.proveedor.proveedorType.name}
                      </Badge>
                    </div>
                    {r.proveedor.phone && (
                      <span className="text-xs text-muted-foreground">
                        {r.proveedor.phone}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={r.reservationStatus.name === "CONFIRMADA" ? "default" : "secondary"} className="text-xs">
                      {r.reservationStatus.name}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {r.seatCount} asiento(s)
                    </span>
                  </div>
                </CardHeader>
                {r.passengers.length > 0 && (
                  <>
                    <Separator />
                    <CardContent className="pt-3">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-muted-foreground">
                            <th className="text-left font-medium pb-2">Nombre</th>
                            <th className="text-left font-medium pb-2">Documento</th>
                            <th className="text-left font-medium pb-2">Nacionalidad</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.passengers.map((rp) => (
                            <tr key={rp.passenger.id} className="border-t">
                              <td className="py-2">
                                {rp.passenger.firstName} {rp.passenger.lastName}
                              </td>
                              <td className="py-2 text-muted-foreground">
                                {rp.passenger.documentType.name} · {rp.passenger.documentNumber}
                              </td>
                              <td className="py-2 text-muted-foreground">
                                {rp.passenger.country.nationality}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Cargo reservations section */}
      <section className="flex flex-col gap-3">
        <header className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <IconPackage className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Encomiendas ({totalCargo})
            </h2>
          </div>
        </header>
        {trip.cargoReservations.length === 0 ? (
          <p className="text-sm text-muted-foreground italic px-1">
            Sin encomiendas.
          </p>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Remitente</th>
                  <th className="text-left px-4 py-2 font-medium">Descripción</th>
                  <th className="text-left px-4 py-2 font-medium">Peso</th>
                  <th className="text-left px-4 py-2 font-medium">Categoría</th>
                  <th className="text-left px-4 py-2 font-medium">Destinatario</th>
                  <th className="text-left px-4 py-2 font-medium">Destino</th>
                  <th className="text-left px-4 py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {trip.cargoReservations.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="px-4 py-2">{proveedorDisplay(c.proveedor)}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {c.description ?? "—"}
                    </td>
                    <td className="px-4 py-2">{c.weightKg} kg</td>
                    <td className="px-4 py-2">{c.categoria?.name ?? "—"}</td>
                    <td className="px-4 py-2">
                      {c.destinatario
                        ? `${c.destinatario.firstName} ${c.destinatario.lastName}`
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {c.destinationBranch?.name ?? c.externalDestination ?? "—"}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-col items-start gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {c.reservationStatus.name}
                        </Badge>
                        {c.cargoStatus && (
                          <Badge variant="outline" className="text-xs">
                            {c.cargoStatus.name}
                          </Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Bottom metadata */}
      <Separator />
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>Creado: {formatDate(trip.createdAt)}</span>
        <span>Última actualización: {formatDate(trip.updatedAt)}</span>
      </div>
    </div>
  );
}

function Detail({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-sm font-medium">{children}</div>
    </div>
  );
}
