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
import { ProveedorTypeBadge } from "@/components/proveedor-type-badge"
import { formatProveedorTypeName, isPersonaType } from "@/lib/proveedor-types"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { api, ApiError } from "@/lib/api/client"
import { ProveedorSheet } from "./proveedor-sheet"

type ProveedorType = { id: string; name: string }
type DocumentType = { id: string; name: string }

type Proveedor = {
  id: string
  proveedorTypeId: string
  proveedorType: { id: string; name: string }
  firstName: string | null
  lastName: string | null
  companyName: string | null
  documentTypeId: string | null
  documentType: { id: string; name: string } | null
  documentNumber: string | null
  email: string
  phone: string | null
}

export function ProveedoresTable({
  data,
  proveedorTypes,
  documentTypes,
}: {
  data: Proveedor[]
  proveedorTypes: ProveedorType[]
  documentTypes: DocumentType[]
}) {
  const router = useRouter()
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null)
  const [deletingProveedor, setDeletingProveedor] = useState<Proveedor | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedTypeId, setSelectedTypeId] = useState<string>("all")

  const filteredData = selectedTypeId === "all"
    ? data
    : data.filter((c) => c.proveedorTypeId === selectedTypeId)

  function getDisplayName(proveedor: Proveedor): string {
    if (isPersonaType(proveedor.proveedorType.name)) {
      return [proveedor.firstName, proveedor.lastName].filter(Boolean).join(" ") || "—"
    }
    return proveedor.companyName ?? "—"
  }

  const columns: ColumnDef<Proveedor>[] = [
    {
      id: "tipo",
      header: "Tipo",
      cell: ({ row }) => <ProveedorTypeBadge name={row.original.proveedorType.name} />,
    },
    {
      id: "nombre",
      header: "Nombre / Empresa",
      cell: ({ row }) => getDisplayName(row.original),
      enableSorting: true,
    },
    {
      id: "tipoDocumento",
      header: "Tipo de documento",
      cell: ({ row }) => row.original.documentType?.name ?? "—",
    },
    {
      id: "numeroDocumento",
      header: "Número de documento",
      cell: ({ row }) => row.original.documentNumber ?? "—",
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setEditingProveedor(row.original)}
          >
            <IconEdit className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeletingProveedor(row.original)}
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
    if (!deletingProveedor) return
    setIsDeleting(true)
    try {
      await api.proveedores.delete(deletingProveedor.id)
      toast.success("Proveedor eliminado")
      router.refresh()
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Error al eliminar el proveedor"
      )
    } finally {
      setIsDeleting(false)
      setDeletingProveedor(null)
    }
  }

  const deletingName = deletingProveedor ? getDisplayName(deletingProveedor) : ""

  return (
    <>
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div className="flex items-center justify-between gap-4">
          <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {proveedorTypes.map((ct) => (
                <SelectItem key={ct.id} value={ct.id}>
                  {formatProveedorTypeName(ct.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ProveedorSheet
            proveedorTypes={proveedorTypes}
            documentTypes={documentTypes}
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
                    No hay proveedores registrados.
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

      {editingProveedor && (
        <ProveedorSheet
          proveedorTypes={proveedorTypes}
          documentTypes={documentTypes}
          proveedor={editingProveedor}
          open={!!editingProveedor}
          onOpenChange={(open) => { if (!open) setEditingProveedor(null) }}
          trigger={false}
        />
      )}

      <AlertDialog
        open={!!deletingProveedor}
        onOpenChange={(open) => { if (!open) setDeletingProveedor(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar proveedor?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar a <strong>{deletingName}</strong>. Esta acción no se puede
              deshacer si el proveedor no tiene reservas asociadas.
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
