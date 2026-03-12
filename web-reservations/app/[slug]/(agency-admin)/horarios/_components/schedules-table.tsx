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
import { deleteTripSchedule } from "@/app/actions/trip-schedule"
import { ScheduleSheet } from "./schedule-sheet"

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
  route: {
    id: string
    origin: string
    destination: string
    branchId: string
  }
}

export function SchedulesTable({
  data,
  routes,
  branches,
  currentSlug,
}: {
  data: Schedule[]
  routes: Route[]
  branches: Branch[]
  currentSlug: string
}) {
  const router = useRouter()
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
  const [deletingSchedule, setDeletingSchedule] = useState<Schedule | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all")
  const [selectedRouteId, setSelectedRouteId] = useState<string>("all")

  const filteredByBranch = selectedBranchId === "all"
    ? data
    : data.filter((s) => s.route.branchId === selectedBranchId)

  const filteredData = selectedRouteId === "all"
    ? filteredByBranch
    : filteredByBranch.filter((s) => s.routeId === selectedRouteId)

  const filteredRoutes = selectedBranchId === "all"
    ? routes
    : routes.filter((r) => r.branchId === selectedBranchId)

  const columns: ColumnDef<Schedule>[] = [
    {
      id: "route",
      header: "Ruta",
      cell: ({ row }) => `${row.original.route.origin} → ${row.original.route.destination}`,
    },
    {
      accessorKey: "time",
      header: "Hora",
      enableSorting: true,
    },
    {
      id: "isActive",
      header: "Activo",
      cell: ({ row }) => (
        <span
          className={
            row.original.isActive
              ? "text-sm font-medium text-green-600"
              : "text-sm font-medium text-muted-foreground"
          }
        >
          {row.original.isActive ? "Sí" : "No"}
        </span>
      ),
    },
    {
      id: "branch",
      header: "Sucursal",
      cell: ({ row }) => {
        const branch = branches.find((b) => b.id === row.original.route.branchId)
        return branch?.name ?? "-"
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setEditingSchedule(row.original)}
          >
            <IconEdit className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeletingSchedule(row.original)}
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
    if (!deletingSchedule) return
    setIsDeleting(true)
    const result = await deleteTripSchedule(deletingSchedule.id, currentSlug)
    setIsDeleting(false)
    setDeletingSchedule(null)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success("Horario eliminado")
    router.refresh()
  }

  return (
    <>
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Select
              value={selectedBranchId}
              onValueChange={(val) => {
                setSelectedBranchId(val)
                setSelectedRouteId("all")
              }}
            >
              <SelectTrigger className="w-[180px]">
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
            <Select value={selectedRouteId} onValueChange={setSelectedRouteId}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Filtrar por ruta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las rutas</SelectItem>
                {filteredRoutes.map((route) => (
                  <SelectItem key={route.id} value={route.id}>
                    {route.origin} → {route.destination}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ScheduleSheet currentSlug={currentSlug} routes={routes} />
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
                    No hay horarios registrados.
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

      {editingSchedule && (
        <ScheduleSheet
          currentSlug={currentSlug}
          routes={routes}
          schedule={editingSchedule}
          open={!!editingSchedule}
          onOpenChange={(open) => { if (!open) setEditingSchedule(null) }}
          trigger={false}
        />
      )}

      <AlertDialog open={!!deletingSchedule} onOpenChange={(open) => { if (!open) setDeletingSchedule(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar horario?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar el horario de las{" "}
              <strong>{deletingSchedule?.time}</strong> para la ruta{" "}
              <strong>
                {deletingSchedule
                  ? `${deletingSchedule.route.origin} → ${deletingSchedule.route.destination}`
                  : ""}
              </strong>.
              Esta acción no se puede deshacer si no hay viajes asociados.
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
