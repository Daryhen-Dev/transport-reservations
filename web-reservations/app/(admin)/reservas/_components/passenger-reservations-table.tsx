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
import { IconTrash, IconPencil, IconCheck, IconX, IconReceipt, IconArrowsExchange } from "@tabler/icons-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { api, ApiError } from "@/lib/api/client"
import { formatDateTime } from "@/lib/format-date"
import { PassengerReservationSheet } from "./passenger-reservation-sheet"
import { TransferToAgencySheet } from "./transfer-to-agency-sheet"
import { ExportCsvButton } from "@/components/export-csv-button"

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDIENTE: "bg-yellow-100 text-yellow-800",
    CONFIRMADA: "bg-green-100 text-green-800",
    CANCELADA: "bg-red-100 text-red-800",
    TRANSFERIDA: "bg-purple-100 text-purple-800",
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
  priceAmount: string | null
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
  transferredToAgency: {
    id: string
    firstName: string | null
    lastName: string | null
    companyName: string | null
  } | null
  reservationStatus: { id: string; name: string }
  _count: { passengers: number }
}

type ReservationStatus = { id: string; name: string }
type DocumentType = { id: string; name: string }
type Country = { id: string; name: string }
type ProveedorType = { id: string; name: string }

export function PassengerReservationsTable({
  data,
  trips,
  reservationStatuses,
  documentTypes,
  countries,
  proveedorTypes,
}: {
  data: Reservation[]
  trips: Trip[]
  reservationStatuses: ReservationStatus[]
  documentTypes: DocumentType[]
  countries: Country[]
  proveedorTypes: ProveedorType[]
}) {
  const router = useRouter()
  const agenciaTypeId = proveedorTypes.find((pt) => pt.name === "AGENCIA")?.id
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const [deletingReservation, setDeletingReservation] = useState<Reservation | null>(null)
  const [cancelingReservation, setCancelingReservation] = useState<Reservation | null>(null)
  const [transferringReservation, setTransferringReservation] = useState<Reservation | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isChangingStatus, setIsChangingStatus] = useState(false)
  const [selectedStatusId, setSelectedStatusId] = useState<string>("all")
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)

  const statusByName = new Map(reservationStatuses.map((s) => [s.name, s]))
  const confirmadaStatus = statusByName.get("CONFIRMADA")
  const canceladaStatus = statusByName.get("CANCELADA")

  const filteredData = selectedStatusId === "all"
    ? data
    : data.filter((r) => r.reservationStatus.id === selectedStatusId)

  async function changeReservationStatus(reservationId: string, statusId: string, successMsg: string) {
    setUpdatingStatusId(reservationId)
    try {
      await api.reservations.passengers.setStatus(reservationId, { reservationStatusId: statusId })
      toast.success(successMsg)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Error al cambiar el estado")
    } finally {
      setUpdatingStatusId(null)
    }
  }

  async function handleCancelReservation() {
    if (!cancelingReservation || !canceladaStatus) return
    setIsChangingStatus(true)
    try {
      await api.reservations.passengers.setStatus(cancelingReservation.id, {
        reservationStatusId: canceladaStatus.id,
      })
      toast.success("Reserva cancelada")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Error al cancelar la reserva")
    } finally {
      setIsChangingStatus(false)
      setCancelingReservation(null)
    }
  }

  const columns: ColumnDef<Reservation>[] = [
    {
      id: "trip",
      header: "Viaje",
      cell: ({ row }) => {
        const trip = row.original.trip
        return (
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {formatDateTime(trip.departureAt)}
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
        const status = reservation.reservationStatus.name
        const isPendiente = status === "PENDIENTE"
        const isConfirmada = status === "CONFIRMADA"
        const isCancelada = status === "CANCELADA"
        const isTransferida = status === "TRANSFERIDA"
        const buyerIsAgencia =
          agenciaTypeId !== undefined &&
          reservation.proveedor.proveedorTypeId === agenciaTypeId
        const canTransfer = (isPendiente || isConfirmada) && !buyerIsAgencia
        const isComplete = reservation._count.passengers >= reservation.seatCount
        const needed = Math.max(0, reservation.seatCount - reservation._count.passengers)
        const isThisUpdating = updatingStatusId === reservation.id

        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Descargar recibo"
              asChild
            >
              <a
                href={api.reservations.passengers.receiptUrl(reservation.id)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <IconReceipt className="size-4" />
              </a>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Gestionar reserva"
              onClick={() => router.push(`/reservas/${reservation.id}`)}
            >
              <IconPencil className="size-4" />
            </Button>
            {isPendiente && confirmadaStatus && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                title={isComplete ? "Confirmar reserva" : `Faltan ${needed} pasajero(s) para confirmar`}
                disabled={!isComplete || isThisUpdating}
                onClick={() =>
                  changeReservationStatus(reservation.id, confirmadaStatus.id, "Reserva confirmada")
                }
              >
                <IconCheck className="size-4" />
              </Button>
            )}
            {canTransfer && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                title="Transferir a otra agencia"
                onClick={() => setTransferringReservation(reservation)}
              >
                <IconArrowsExchange className="size-4" />
              </Button>
            )}
            {!isCancelada && !isTransferida && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                title="Cancelar reserva"
                disabled={isThisUpdating}
                onClick={() => setCancelingReservation(reservation)}
              >
                <IconX className="size-4" />
              </Button>
            )}
            {isPendiente && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                title="Eliminar reserva"
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
      await api.reservations.passengers.delete(deletingReservation.id)
      toast.success("Reserva eliminada")
      router.refresh()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Error al eliminar la reserva"
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
            <ExportCsvButton href="/api/v1/reservations/passengers/export.csv" />
            <PassengerReservationSheet
              trips={trips}
              documentTypes={documentTypes}
              countries={countries}
              reservationStatuses={reservationStatuses}
              proveedorTypes={proveedorTypes}
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

      <TransferToAgencySheet
        reservation={transferringReservation}
        onOpenChange={(open) => {
          if (!open) setTransferringReservation(null)
        }}
      />

      <AlertDialog open={!!cancelingReservation} onOpenChange={(open) => { if (!open) setCancelingReservation(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar reserva?</AlertDialogTitle>
            <AlertDialogDescription>
              La reserva quedará marcada como CANCELADA y no se tendrá en
              cuenta para los asientos del viaje. Esta acción puede revertirse
              cambiando el estado de nuevo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isChangingStatus}>
              No, dejar como está
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelReservation}
              disabled={isChangingStatus}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isChangingStatus ? "Cancelando..." : "Sí, cancelar reserva"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
