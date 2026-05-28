"use client"

import { useEffect, useState } from "react"
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
import { IconEdit, IconEye, IconTrash, IconAnchor, IconLock, IconLockOpen, IconFileCheck, IconFileText } from "@tabler/icons-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { api, ApiError } from "@/lib/api/client"
import { Badge } from "@/components/ui/badge"
import { TripSheet } from "./trip-sheet"
import { ExportCsvButton } from "@/components/export-csv-button"
import { TripCrewSheet } from "./trip-crew-sheet"

type Branch = { id: string; name: string }

type Route = {
  id: string
  origin: string
  destination: string
  branchId: string
}

type Schedule = {
  id: string
  routeId: string
  time: string
  isActive: boolean
  route: { id: string; origin: string; destination: string; branchId: string }
}

type CrewAssignment = {
  crewMemberId: string
  crewRoleId: string
  crewMember: { id: string; firstName: string; lastName: string }
  crewRole: { id: string; name: string }
}

type PassengerReservationSummary = {
  id: string
  seatCount: number
  _count: { passengers: number }
  reservationStatus: { name: string }
}

type Trip = {
  id: string
  departureAt: Date
  routeId: string
  branchId: string
  scheduleId: string | null
  route: { id: string; origin: string; destination: string }
  branch: { id: string; name: string }
  crew: CrewAssignment[]
  status: { id: string; name: string }
  manifest: { code: string } | null
  passengerReservations: PassengerReservationSummary[]
}

function allPassengersAssigned(trip: Trip): boolean {
  return trip.passengerReservations.every(
    (r) => r._count.passengers >= r.seatCount
  )
}

type CrewRole = { id: string; name: string }

export function TripsTable({
  data,
  branches,
  routes,
  schedules,
  crewRoles,
  documentTypes,
}: {
  data: Trip[]
  branches: Branch[]
  routes: Route[]
  schedules: Schedule[]
  crewRoles: CrewRole[]
  documentTypes: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null)
  const [deletingTrip, setDeletingTrip] = useState<Trip | null>(null)
  const [crewTrip, setCrewTrip] = useState<Trip | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [generatingManifestId, setGeneratingManifestId] = useState<string | null>(null)
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all")

  const filteredData = selectedBranchId === "all"
    ? data
    : data.filter((t) => t.branchId === selectedBranchId)

  // Keep the open crew sheet in sync with fresh server data after each
  // assign/remove (router.refresh() re-renders this component but the
  // crewTrip state would otherwise point to the stale snapshot).
  useEffect(() => {
    if (!crewTrip) return
    const fresh = data.find((t) => t.id === crewTrip.id)
    if (fresh && fresh !== crewTrip) setCrewTrip(fresh)
  }, [data, crewTrip])

  const columns: ColumnDef<Trip>[] = [
    {
      id: "departureAt",
      header: "Fecha y hora",
      accessorFn: (row) => row.departureAt,
      cell: ({ row }) => {
        const date = new Date(row.original.departureAt)
        return date.toLocaleString("es-AR", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      },
      enableSorting: true,
    },
    {
      id: "route",
      header: "Ruta",
      cell: ({ row }) => `${row.original.route.origin} → ${row.original.route.destination}`,
    },
    {
      id: "branchName",
      header: "Sucursal",
      cell: ({ row }) => row.original.branch.name,
    },
    {
      id: "status",
      header: "Estado",
      cell: ({ row }) => {
        const isClosed = row.original.status.name === "CERRADO"
        return (
          <Badge variant={isClosed ? "secondary" : "outline"} className="text-xs">
            {row.original.status.name}
          </Badge>
        )
      },
    },
    {
      id: "crew",
      header: "Tripulación",
      cell: ({ row }) => {
        const count = row.original.crew.length
        return (
          <button
            type="button"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setCrewTrip(row.original)}
          >
            <IconAnchor className="size-3.5" />
            {count > 0 ? `${count}/3` : "Asignar"}
          </button>
        )
      },
    },
    {
      id: "manifest",
      header: "Manifiesto",
      cell: ({ row }) => {
        const isClosed = row.original.status.name === "CERRADO"
        if (!isClosed) return null
        const isGenerating = generatingManifestId === row.original.id

        if (row.original.manifest) {
          return (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs font-mono">
                {row.original.manifest.code}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                title="Descargar PDF"
                onClick={() => window.open(`/api/manifests/${row.original.manifest!.code}`, "_blank")}
              >
                <IconFileText className="size-4 text-blue-600" />
              </Button>
            </div>
          )
        }

        return (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs"
            disabled={isGenerating}
            title="Generar manifiesto"
            onClick={async () => {
              setGeneratingManifestId(row.original.id)
              try {
                const result = await api.manifests.generate(row.original.id)
                toast.success(
                  result.alreadyExisted
                    ? `Manifiesto ${result.code} ya existía`
                    : `Manifiesto ${result.code} generado`
                )
                router.refresh()
              } catch (err) {
                toast.error(err instanceof ApiError ? err.message : "Error al generar manifiesto")
              } finally {
                setGeneratingManifestId(null)
              }
            }}
          >
            <IconFileCheck className="size-4 text-emerald-600" />
            {isGenerating ? "Generando..." : "Generar"}
          </Button>
        )
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const isClosed = row.original.status.name === "CERRADO"
        const isToggling = togglingId === row.original.id
        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              title={isClosed ? "Reabrir viaje" : "Cerrar viaje"}
              disabled={isToggling}
              onClick={async () => {
                setTogglingId(row.original.id)
                try {
                  if (isClosed) {
                    await api.trips.open(row.original.id)
                  } else {
                    await api.trips.close(row.original.id)
                  }
                  toast.success(isClosed ? "Viaje reabierto" : "Viaje cerrado")
                  router.refresh()
                } catch (err) {
                  toast.error(
                    err instanceof ApiError
                      ? err.message
                      : isClosed
                        ? "Error al reabrir el viaje"
                        : "Error al cerrar el viaje"
                  )
                } finally {
                  setTogglingId(null)
                }
              }}
            >
              {isClosed
                ? <IconLockOpen className="size-4 text-green-600" />
                : <IconLock className="size-4 text-amber-500" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Ver detalles"
              asChild
            >
              <Link href={`/viajes/${row.original.id}`}>
                <IconEye className="size-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Editar"
              onClick={() => setEditingTrip(row.original)}
            >
              <IconEdit className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              title="Eliminar"
              onClick={() => setDeletingTrip(row.original)}
            >
              <IconTrash className="size-4" />
            </Button>
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
    if (!deletingTrip) return
    setIsDeleting(true)
    try {
      await api.trips.delete(deletingTrip.id)
      toast.success("Viaje eliminado")
      setDeletingTrip(null)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Error al eliminar el viaje")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div className="flex items-center justify-between gap-4">
          <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por sucursal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las sucursales</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <ExportCsvButton href="/api/v1/trips/export.csv" />
            <TripSheet branches={branches} routes={routes} schedules={schedules} />
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
                    No hay viajes registrados.
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

      <TripCrewSheet
        trip={crewTrip}
        open={!!crewTrip}
        onOpenChange={(open) => { if (!open) setCrewTrip(null) }}
        crewRoles={crewRoles}
        documentTypes={documentTypes}
      />

      {editingTrip && (
        <TripSheet
          branches={branches}
          routes={routes}
          schedules={schedules}
          trip={editingTrip}
          open={!!editingTrip}
          onOpenChange={(open) => { if (!open) setEditingTrip(null) }}
          trigger={false}
        />
      )}

      <AlertDialog open={!!deletingTrip} onOpenChange={(open) => { if (!open) setDeletingTrip(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar viaje?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar el viaje del{" "}
              <strong>
                {deletingTrip
                  ? new Date(deletingTrip.departureAt).toLocaleString("es-AR", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : ""}
              </strong>. Esta acción no se puede deshacer si no hay reservas asociadas.
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
