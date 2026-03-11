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
import { Input } from "@/components/ui/input"
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
import { deleteRoute } from "@/app/actions/route"
import { RouteSheet } from "./route-sheet"

type Branch = { id: string; name: string }

type Route = {
  id: string
  origin: string
  destination: string
  branchId: string
  branch: { id: string; name: string }
}

export function RoutesTable({
  data,
  branches,
  currentSlug,
}: {
  data: Route[]
  branches: Branch[]
  currentSlug: string
}) {
  const router = useRouter()
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const [editingRoute, setEditingRoute] = useState<Route | null>(null)
  const [deletingRoute, setDeletingRoute] = useState<Route | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all")

  const filteredData = selectedBranchId === "all"
    ? data
    : data.filter((r) => r.branchId === selectedBranchId)

  const columns: ColumnDef<Route>[] = [
    {
      accessorKey: "origin",
      header: "Origen",
      enableSorting: true,
    },
    {
      accessorKey: "destination",
      header: "Destino",
    },
    {
      id: "branchName",
      header: "Sucursal",
      accessorFn: (row) => row.branch.name,
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
            onClick={() => setEditingRoute(row.original)}
          >
            <IconEdit className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeletingRoute(row.original)}
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
    if (!deletingRoute) return
    setIsDeleting(true)
    const result = await deleteRoute(deletingRoute.id, currentSlug)
    setIsDeleting(false)
    setDeletingRoute(null)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success("Ruta eliminada")
    router.refresh()
  }

  return (
    <>
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Buscar por origen..."
              value={(table.getColumn("origin")?.getFilterValue() as string) ?? ""}
              onChange={(e) => table.getColumn("origin")?.setFilterValue(e.target.value)}
              className="max-w-xs"
            />
            <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
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
          </div>
          <RouteSheet currentSlug={currentSlug} branches={branches} />
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
                    No hay rutas registradas.
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

      {editingRoute && (
        <RouteSheet
          currentSlug={currentSlug}
          branches={branches}
          route={editingRoute}
          open={!!editingRoute}
          onOpenChange={(open) => { if (!open) setEditingRoute(null) }}
          trigger={false}
        />
      )}

      <AlertDialog open={!!deletingRoute} onOpenChange={(open) => { if (!open) setDeletingRoute(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar ruta?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar la ruta{" "}
              <strong>{deletingRoute?.origin} → {deletingRoute?.destination}</strong>.
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
