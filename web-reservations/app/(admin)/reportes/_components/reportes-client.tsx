"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconDownload } from "@tabler/icons-react"
import { api, ApiError, type SalesReport } from "@/lib/api/client"
import { formatProveedorTypeName } from "@/lib/proveedor-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function money(n: number): string {
  return `$${n.toFixed(2)}`
}

type Props = {
  branchId: string
  initialFrom: string
  initialTo: string
  initialReport: SalesReport
}

export function ReportesClient({
  branchId,
  initialFrom,
  initialTo,
  initialReport,
}: Props) {
  const router = useRouter()
  const [from, setFrom] = useState(initialFrom)
  const [to, setTo] = useState(initialTo)
  const [report, setReport] = useState<SalesReport>(initialReport)
  const [isPending, startTransition] = useTransition()

  function applyFilters() {
    startTransition(async () => {
      try {
        const next = await api.reports.sales({
          from: from || undefined,
          to: to || undefined,
          branchId,
        })
        setReport(next)
        const url = new URL(window.location.href)
        if (from) url.searchParams.set("from", from)
        else url.searchParams.delete("from")
        if (to) url.searchParams.set("to", to)
        else url.searchParams.delete("to")
        router.replace(url.pathname + (url.search ? `?${url.searchParams}` : ""))
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : "Error al obtener el reporte"
        )
      }
    })
  }

  function csvUrl() {
    const q = new URLSearchParams({ branchId })
    if (from) q.set("from", from)
    if (to) q.set("to", to)
    return `/api/v1/reservations/passengers/export.csv?${q.toString()}`
  }

  return (
    <div className="flex flex-col gap-6 py-4 md:py-6">
      <div className="px-4 lg:px-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Reportes de ventas</h1>
        <p className="text-sm text-muted-foreground">
          Resumen de reservas de pasajeros por tipo de comprador, tipo de precio y ruta.
        </p>
      </div>

      <div className="px-4 lg:px-6 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="from">Desde</Label>
          <Input
            id="from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="to">Hasta</Label>
          <Input
            id="to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-40"
          />
        </div>
        <Button onClick={applyFilters} disabled={isPending}>
          {isPending ? "Cargando..." : "Aplicar"}
        </Button>
        <Button variant="outline" asChild>
          <a href={csvUrl()}>
            <IconDownload className="size-4" />
            Exportar CSV
          </a>
        </Button>
      </div>

      {/* KPIs */}
      <div className="px-4 lg:px-6 grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card label="Reservas" value={String(report.totals.reservationCount)} />
        <Card label="Asientos" value={String(report.totals.seatCount)} />
        <Card label="Ingresos" value={money(report.totals.revenueAmount)} />
        <Card label="Comisiones" value={money(report.totals.commissionAmount)} />
        <Card label="Comisión transferencias" value={money(report.totals.transferCommissionAmount)} />
      </div>

      {/* Por tipo de proveedor */}
      <section className="px-4 lg:px-6">
        <h2 className="text-lg font-semibold mb-3">Por tipo de comprador</h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Reservas</TableHead>
                <TableHead className="text-right">Asientos</TableHead>
                <TableHead className="text-right">Ingresos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.byProveedorType.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground py-6"
                  >
                    Sin reservas en el rango.
                  </TableCell>
                </TableRow>
              ) : (
                report.byProveedorType.map((t) => (
                  <TableRow key={t.proveedorTypeName}>
                    <TableCell>
                      {formatProveedorTypeName(t.proveedorTypeName)}
                    </TableCell>
                    <TableCell className="text-right">{t.reservationCount}</TableCell>
                    <TableCell className="text-right">{t.seatCount}</TableCell>
                    <TableCell className="text-right">
                      {money(t.revenueAmount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Por tipo de precio */}
      <section className="px-4 lg:px-6">
        <h2 className="text-lg font-semibold mb-3">Por tipo de precio</h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Reservas</TableHead>
                <TableHead className="text-right">Asientos</TableHead>
                <TableHead className="text-right">Ingresos</TableHead>
                <TableHead className="text-right">Comisiones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.byPriceType.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-6"
                  >
                    Sin reservas en el rango.
                  </TableCell>
                </TableRow>
              ) : (
                report.byPriceType.map((p) => (
                  <TableRow key={p.priceType}>
                    <TableCell>{p.priceType}</TableCell>
                    <TableCell className="text-right">{p.reservationCount}</TableCell>
                    <TableCell className="text-right">{p.seatCount}</TableCell>
                    <TableCell className="text-right">
                      {money(p.revenueAmount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {money(p.commissionAmount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Por agencia de transferencia */}
      <section className="px-4 lg:px-6">
        <h2 className="text-lg font-semibold mb-3">Transferidas a agencia</h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agencia</TableHead>
                <TableHead className="text-right">Reservas</TableHead>
                <TableHead className="text-right">Asientos</TableHead>
                <TableHead className="text-right">Enviado a agencia</TableHead>
                <TableHead className="text-right">Comisión retenida</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.byTransferAgency.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-6"
                  >
                    No hubo transferencias en el rango.
                  </TableCell>
                </TableRow>
              ) : (
                report.byTransferAgency.map((a) => (
                  <TableRow key={a.agencyId}>
                    <TableCell>{a.agencyName}</TableCell>
                    <TableCell className="text-right">{a.reservationCount}</TableCell>
                    <TableCell className="text-right">{a.seatCount}</TableCell>
                    <TableCell className="text-right">{money(a.amountSentToAgency)}</TableCell>
                    <TableCell className="text-right">{money(a.commissionEarned)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Por ruta */}
      <section className="px-4 lg:px-6">
        <h2 className="text-lg font-semibold mb-3">Por ruta</h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ruta</TableHead>
                <TableHead className="text-right">Reservas</TableHead>
                <TableHead className="text-right">Asientos</TableHead>
                <TableHead className="text-right">Ingresos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.byRoute.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground py-6"
                  >
                    Sin reservas en el rango.
                  </TableCell>
                </TableRow>
              ) : (
                report.byRoute.map((r) => (
                  <TableRow key={r.routeId}>
                    <TableCell>{r.label}</TableCell>
                    <TableCell className="text-right">{r.reservationCount}</TableCell>
                    <TableCell className="text-right">{r.seatCount}</TableCell>
                    <TableCell className="text-right">
                      {money(r.revenueAmount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}

function Card({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: "negative"
}) {
  return (
    <div className="rounded-md border bg-card p-4 flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span
        className={`text-xl font-semibold ${tone === "negative" ? "text-destructive" : ""}`}
      >
        {value}
      </span>
    </div>
  )
}
