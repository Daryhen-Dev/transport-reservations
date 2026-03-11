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
import { IconEdit, IconTrash } from "@tabler/icons-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { deleteTrip } from "@/app/actions/trip"
import { TripSheet } from "./trip-sheet"

type Branch = { id: string; name: string }

type Route = {
  id: string
  origin: string
  destination: string
  branchId: string
}

type Trip = {
  id: string
  departureAt: Date
  routeId: string
  branchId: string
  route: { id: string; origin: string; destination: string }
  branch: { id: string; name: string }
}

export function TripsTable({
  data,
  branches,
  routes,
  currentSlug,
}: {
  data: Trip[]
  branches: Branch[]
  routes: Route[]
  currentSlug: string
}) {
  const router = useRouter()
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null)
  const [deletingTrip, setDeletingTrip] = useState<Trip | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all")

  const filteredData = selectedBranchId === "all"
    ? data
    : data.filter((t) => t.branchId === selectedBranchId)

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
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setEditingTrip(row.original)}
          >
            <IconEdit className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeletingTrip(row.original)}
          >
            <IconTrash className="size-4" />
          </Button>
        </div>
      ),
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
    const result = await deleteTrip(deletingTrip.id, currentSlug)
    setIsDeleting(false)
    setDeletingTrip(null)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success("Viaje eliminado")
    router.refresh()
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
          <TripSheet currentSlug={currentSlug} branches={branches} routes={routes} />
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

      {editingTrip && (
        <TripSheet
          currentSlug={currentSlug}
          branches={branches}
          routes={routes}
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
