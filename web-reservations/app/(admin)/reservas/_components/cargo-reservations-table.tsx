"use client"

import { useState } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { IconTrash } from "@tabler/icons-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { api, ApiError } from "@/lib/api/client"
import { CargoReservationSheet } from "./cargo-reservation-sheet"
import { ExportCsvButton } from "@/components/export-csv-button"

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDIENTE: "bg-yellow-100 text-yellow-800",
    CONFIRMADA: "bg-green-100 text-green-800",
    CANCELADA: "bg-red-100 text-red-800",
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-800"}`}>
      {status}
    </span>
  )
}

type Trip = {
  id: string
  departureAt: Date
  route: { origin: string; destination: string }
  branch: { name: string }
}

type CargoReservation = {
  id: string
  weightKg: number
  priceAmount: unknown // Prisma Decimal serializes differently; we don't need to read it directly here
  cobrarEnDestino: boolean
  description: string | null
  destinationBranchId: string | null
  externalDestination: string | null
  trip: {
    id: string
    departureAt: Date
    route: { id: string; origin: string; destination: string }
    branch: { id: string; name: string }
  }
  proveedor: {
    id: string
    firstName: string | null
    lastName: string | null
    companyName: string | null
    proveedorTypeId: string
  }
  reservationStatus: { id: string; name: string }
  categoria: { id: string; name: string }
  destinatario: { id: string; firstName: string; lastName: string; phone: string | null } | null
}

type ReservationStatus = { id: string; name: string }
type DocumentType = { id: string; name: string }
type Country = { id: string; name: string }
type ProveedorType = { id: string; name: string }

export function CargoReservationsTable({
  data,
  trips,
  reservationStatuses,
  documentTypes,
  countries,
  proveedorTypes,
  categorias,
  branches,
}: {
  data: CargoReservation[]
  trips: Trip[]
  reservationStatuses: ReservationStatus[]
  documentTypes: DocumentType[]
  countries: Country[]
  proveedorTypes: ProveedorType[]
  categorias: { id: string; name: string }[]
  branches: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const [deletingReservation, setDeletingReservation] = useState<CargoReservation | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedStatusId, setSelectedStatusId] = useState<string>("all")
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)

  const filteredData = selectedStatusId === "all"
    ? data
    : data.filter((r) => r.reservationStatus.id === selectedStatusId)

  const columns: ColumnDef<CargoReservation>[] = [
    {
      id: "trip",
      header: "Viaje",
      cell: ({ row }) => {
        const trip = row.original.trip
        return (
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {new Date(trip.departureAt).toLocaleString("es-AR", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span className="text-xs text-muted-foreground">
              {trip.route.origin} → {trip.route.destination}
            </span>
          </div>
        )
      },
    },
    {
      id: "proveedor",
      header: "Proveedor",
      cell: ({ row }) => {
        const p = row.original.proveedor
        return p.companyName ?? `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim()
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
            <span className="text-sm">{`${d.firstName} ${d.lastName}`}</span>
            {d.phone && <span className="text-xs text-muted-foreground">{d.phone}</span>}
          </div>
        )
      },
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
      id: "weight",
      header: "Peso (kg)",
      cell: ({ row }) => `${row.original.weightKg} kg`,
    },
    {
      id: "price",
      header: "Precio",
      cell: ({ row }) => {
        const amount = String(row.original.priceAmount ?? "0")
        const label = `$ ${Number(amount).toFixed(2)}`
        return row.original.cobrarEnDestino ? (
          <span>
            {label}{" "}
            <span className="text-xs text-amber-600 font-medium">(por cobrar)</span>
          </span>
        ) : (
          label
        )
      },
    },
    {
      id: "status",
      header: "Estado",
      cell: ({ row }) => <StatusBadge status={row.original.reservationStatus.name} />,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const reservation = row.original
        const isPendiente = reservation.reservationStatus.name === "PENDIENTE"
        return (
          <div className="flex items-center justify-end gap-2">
            <Select
              defaultValue={reservation.reservationStatus.id}
              disabled={updatingStatusId === reservation.id}
              onValueChange={async (val) => {
                setUpdatingStatusId(reservation.id)
                try {
                  await api.reservations.cargo.setStatus(reservation.id, { reservationStatusId: val })
                  toast.success("Estado actualizado")
                  router.refresh()
                } catch (err) {
                  const message = err instanceof ApiError ? err.message : "Error al actualizar el estado"
                  toast.error(message)
                } finally {
                  setUpdatingStatusId(null)
                }
              }}
            >
              <SelectTrigger className="h-8 w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {reservationStatuses.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isPendiente && (
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeletingReservation(reservation)}
              >
                <IconTrash className="size-4" />
              </Button>
            )}
          </div>
        )
      },
    },
  ]

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
    initialState: { pagination: { pageSize: 10 } },
  })

  async function handleDelete() {
    if (!deletingReservation) return
    setIsDeleting(true)
    try {
      await api.reservations.cargo.delete(deletingReservation.id)
      toast.success("Encomienda eliminada")
      router.refresh()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Error al eliminar la encomienda"
      toast.error(message)
    } finally {
      setIsDeleting(false)
      setDeletingReservation(null)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div className="flex items-center justify-between gap-4">
          <Select value={selectedStatusId} onValueChange={setSelectedStatusId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {reservationStatuses.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <ExportCsvButton href="/api/v1/reservations/cargo/export.csv" />
            <CargoReservationSheet
              trips={trips}
              documentTypes={documentTypes}
              countries={countries}
              reservationStatuses={reservationStatuses}
              proveedorTypes={proveedorTypes}
              categorias={categorias}
              branches={branches}
            />
          </div>
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
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No hay encomiendas registradas.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
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

      <AlertDialog open={!!deletingReservation} onOpenChange={(open) => { if (!open) setDeletingReservation(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar encomienda?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar esta reserva de encomienda. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
