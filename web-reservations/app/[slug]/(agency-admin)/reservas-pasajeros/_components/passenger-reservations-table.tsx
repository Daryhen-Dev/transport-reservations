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
import { deletePassengerReservation, updateReservationStatus } from "@/app/actions/passenger-reservation"
import { PassengerReservationSheet } from "./passenger-reservation-sheet"

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

type Reservation = {
  id: string
  seatCount: number
  trip: {
    id: string
    departureAt: Date
    route: { id: string; origin: string; destination: string }
    branch: { id: string; name: string }
  }
  customer: {
    id: string
    firstName: string | null
    lastName: string | null
    companyName: string | null
    customerTypeId: string
  }
  reservationStatus: { id: string; name: string }
  _count: { passengers: number }
}

type ReservationStatus = { id: string; name: string }
type DocumentType = { id: string; name: string }
type Country = { id: string; name: string }
type CustomerType = { id: string; name: string }

export function PassengerReservationsTable({
  data,
  trips,
  reservationStatuses,
  documentTypes,
  countries,
  customerTypes,
  currentSlug,
}: {
  data: Reservation[]
  trips: Trip[]
  reservationStatuses: ReservationStatus[]
  documentTypes: DocumentType[]
  countries: Country[]
  customerTypes: CustomerType[]
  currentSlug: string
}) {
  const router = useRouter()
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const [deletingReservation, setDeletingReservation] = useState<Reservation | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedStatusId, setSelectedStatusId] = useState<string>("all")
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)

  const filteredData = selectedStatusId === "all"
    ? data
    : data.filter((r) => r.reservationStatus.id === selectedStatusId)

  const columns: ColumnDef<Reservation>[] = [
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
      id: "customer",
      header: "Cliente",
      cell: ({ row }) => {
        const c = row.original.customer
        return c.companyName ?? `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim()
      },
    },
    {
      accessorKey: "seatCount",
      header: "Asientos",
    },
    {
      id: "passengerCount",
      header: "Pasajeros",
      cell: ({ row }) => row.original._count.passengers,
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
                const result = await updateReservationStatus(reservation.id, val, currentSlug)
                setUpdatingStatusId(null)
                if (result.error) {
                  toast.error(result.error)
                } else {
                  toast.success("Estado actualizado")
                  router.refresh()
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
    const result = await deletePassengerReservation(deletingReservation.id, currentSlug)
    setIsDeleting(false)
    setDeletingReservation(null)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success("Reserva eliminada")
    router.refresh()
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
          <PassengerReservationSheet
            currentSlug={currentSlug}
            trips={trips}
            documentTypes={documentTypes}
            countries={countries}
            reservationStatuses={reservationStatuses}
            customerTypes={customerTypes}
          />
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
                    No hay reservas de pasajeros registradas.
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
            <AlertDialogTitle>¿Eliminar reserva?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar esta reserva de pasajeros. Esta acción no se puede deshacer.
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
