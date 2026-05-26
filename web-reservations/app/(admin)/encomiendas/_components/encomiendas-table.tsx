"use client"

import { useState, useMemo } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

type CargoStatus = { id: string; name: string }

type CargoReservation = {
  id: string
  weightKg: number
  description: string | null
  externalDestination: string | null
  trip: {
    route: { origin: string; destination: string }
    branch: { id: string; name: string }
    manifest: { code: string } | null
  }
  cargoStatus: CargoStatus | null
  destinationBranch: { id: string; name: string } | null
  proveedor: { id: string; firstName: string | null; lastName: string | null; companyName: string | null }
  destinatario: { id: string; firstName: string; lastName: string; phone: string | null } | null
  categoria: { id: string; name: string } | null
}

const CARGO_STATUS_STYLES: Record<string, string> = {
  "EN TRANSITO":  "bg-blue-100 text-blue-800",
  "ENTREGADA":    "bg-green-100 text-green-800",
  "NO RECLAMADA": "bg-yellow-100 text-yellow-800",
  "DEVUELTA":     "bg-red-100 text-red-800",
}

function CargoStatusBadge({ status }: { status: string | null }) {
  if (!status) {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-600 px-2 py-0.5 text-xs font-medium">
        Pendiente
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CARGO_STATUS_STYLES[status] ?? "bg-gray-100 text-gray-800"}`}>
      {status}
    </span>
  )
}

export function EncomiendасTable({
  data,
  cargoStatuses,
  currentBranchId,
}: {
  data: CargoReservation[]
  cargoStatuses: CargoStatus[]
  currentSlug?: string
  currentBranchId: string
}) {
  const [localData, setLocalData] = useState<CargoReservation[]>(data)
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const [textFilter, setTextFilter] = useState("")
  const [manifestFilter, setManifestFilter] = useState("")
  const [selectedCargoStatusId, setSelectedCargoStatusId] = useState("all")
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const filteredData = useMemo(() => {
    const byStatus = selectedCargoStatusId === "all"
      ? localData
      : selectedCargoStatusId === "null"
        ? localData.filter((r) => r.cargoStatus === null)
        : localData.filter((r) => r.cargoStatus?.id === selectedCargoStatusId)

    if (!textFilter && !manifestFilter) return byStatus

    const text = textFilter.toLowerCase()
    const manifest = manifestFilter.toLowerCase()

    return byStatus.filter((r) => {
      const proveedorName = r.proveedor.companyName
        ?? `${r.proveedor.firstName ?? ""} ${r.proveedor.lastName ?? ""}`.trim()
      const destinatarioName = r.destinatario
        ? `${r.destinatario.firstName} ${r.destinatario.lastName}`
        : ""

      const matchesText =
        !text ||
        proveedorName.toLowerCase().includes(text) ||
        destinatarioName.toLowerCase().includes(text) ||
        (r.description ?? "").toLowerCase().includes(text)

      const matchesManifest =
        !manifest ||
        (r.trip.manifest?.code ?? "").toLowerCase().includes(manifest)

      return matchesText && matchesManifest
    })
  }, [localData, textFilter, manifestFilter, selectedCargoStatusId])

  const columns: ColumnDef<CargoReservation>[] = useMemo(() => [
    {
      id: "manifest",
      header: "Manifiesto",
      cell: ({ row }) => {
        const code = row.original.trip.manifest?.code
        return code ? (
          <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-800 px-2 py-0.5 text-xs font-mono font-medium">
            {code}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )
      },
    },
    {
      id: "proveedor",
      header: "Remitente",
      cell: ({ row }) => {
        const p = row.original.proveedor
        return p.companyName ?? `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim()
      },
    },
    {
      id: "description",
      header: "Descripción",
      cell: ({ row }) =>
        row.original.description ? (
          <span className="max-w-[180px] truncate block">{row.original.description}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "weight",
      header: "Peso",
      cell: ({ row }) => `${row.original.weightKg} kg`,
    },
    {
      id: "categoria",
      header: "Categoría",
      cell: ({ row }) => {
        const c = row.original.categoria
        return c ? (
          <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-xs font-medium">
            {c.name}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      },
    },
    {
      id: "destinatario",
      header: "Destinatario",
      cell: ({ row }) => {
        const d = row.original.destinatario
        if (!d) return <span className="text-muted-foreground">—</span>
        return (
          <div className="flex flex-col">
            <span className="text-sm">{d.firstName} {d.lastName}</span>
            {d.phone && <span className="text-xs text-muted-foreground">{d.phone}</span>}
          </div>
        )
      },
    },
    {
      id: "destination",
      header: "Destino",
      cell: ({ row }) => {
        const r = row.original
        return r.destinationBranch?.name ?? r.externalDestination ?? (
          <span className="text-muted-foreground">—</span>
        )
      },
    },
    {
      id: "cargoStatus",
      header: "Estado de carga",
      cell: ({ row }) => <CargoStatusBadge status={row.original.cargoStatus?.name ?? null} />,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const reservation = row.original
        const isOriginBranch = reservation.trip.branch.id === currentBranchId
        if (isOriginBranch) return null
        return (
          <Select
            defaultValue={reservation.cargoStatus?.id ?? ""}
            disabled={updatingId === reservation.id}
            onValueChange={async (cargoStatusId) => {
              setUpdatingId(reservation.id)
              try {
                const res = await fetch("/api/cargo-status", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ cargoReservationId: reservation.id, cargoStatusId }),
                })
                const result = await res.json()
                if (!res.ok || result.error) {
                  toast.error(result.error ?? "Error al actualizar")
                  return
                }
                toast.success("Estado actualizado")
                const newStatus = cargoStatuses.find((s) => s.id === cargoStatusId) ?? null
                setLocalData((prev) =>
                  prev.map((r) => (r.id === reservation.id ? { ...r, cargoStatus: newStatus } : r))
                )
              } catch {
                toast.error("Error de red al actualizar")
              } finally {
                setUpdatingId(null)
              }
            }}
          >
            <SelectTrigger className="h-8 w-[140px]">
              <SelectValue placeholder="Cambiar estado" />
            </SelectTrigger>
            <SelectContent>
              {cargoStatuses.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [updatingId, cargoStatuses, currentBranchId])

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { columnFilters, sorting },
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  })

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Buscar remitente, destinatario, descripción..."
          value={textFilter}
          onChange={(e) => setTextFilter(e.target.value)}
          className="h-9 w-[280px]"
        />
        <Input
          placeholder="Código de manifiesto"
          value={manifestFilter}
          onChange={(e) => setManifestFilter(e.target.value)}
          className="h-9 w-[200px] font-mono"
        />
        <Select value={selectedCargoStatusId} onValueChange={setSelectedCargoStatusId}>
          <SelectTrigger className="h-9 w-[180px]">
            <SelectValue placeholder="Estado de carga" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="null">Sin estado</SelectItem>
            {cargoStatuses.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No hay encomiendas registradas.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredData.length} encomienda{filteredData.length !== 1 ? "s" : ""} · Página{" "}
          {table.getState().pagination.pageIndex + 1} de {table.getPageCount() || 1}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  )
}
