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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { deletePassenger } from "@/app/actions/passenger"
import { PassengerSheet } from "./passenger-sheet"

type Passenger = {
  id: string
  firstName: string
  lastName: string
  documentType: { id: string; name: string }
  documentNumber: string
  country: { id: string; name: string }
  birthDate: Date | null
  phone: string | null
  _count: { reservations: number }
}

type Props = {
  data: Passenger[]
  documentTypes: Array<{ id: string; name: string }>
  countries: Array<{ id: string; name: string }>
  currentSlug: string
}

export function PassengersTable({ data, documentTypes, countries, currentSlug }: Props) {
  const router = useRouter()
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingPassenger, setEditingPassenger] = useState<Passenger | null>(null)
  const [deletingPassenger, setDeletingPassenger] = useState<Passenger | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  function handleEdit(p: Passenger) {
    setEditingPassenger(p)
    setSheetOpen(true)
  }

  function handleNewPassenger() {
    setEditingPassenger(null)
    setSheetOpen(true)
  }

  const columns: ColumnDef<Passenger>[] = [
    {
      id: "name",
      header: "Nombre",
      accessorFn: (row) => `${row.firstName} ${row.lastName}`,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">
            {row.original.firstName} {row.original.lastName}
          </span>
          {row.original.phone && (
            <span className="text-xs text-muted-foreground">{row.original.phone}</span>
          )}
        </div>
      ),
    },
    {
      id: "documentType",
      header: "Documento",
      accessorFn: (row) => row.documentType.name,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.documentType.name}</span>
      ),
    },
    {
      id: "documentNumber",
      header: "N° Documento",
      accessorFn: (row) => row.documentNumber,
      cell: ({ row }) => <span className="text-sm">{row.original.documentNumber}</span>,
    },
    {
      id: "country",
      header: "País",
      accessorFn: (row) => row.country.name,
      cell: ({ row }) => row.original.country.name,
    },
    {
      id: "birthDate",
      header: "Nacimiento",
      cell: ({ row }) =>
        row.original.birthDate ? (
          format(new Date(row.original.birthDate), "dd/MM/yyyy", { locale: es })
        ) : (
          <span className="text-muted-foreground/60 italic">—</span>
        ),
    },
    {
      id: "reservations",
      header: "Reservas",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original._count.reservations}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const p = row.original
        const canDelete = p._count.reservations === 0
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleEdit(p)}
            >
              <IconPencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive disabled:opacity-30"
              onClick={() => setDeletingPassenger(p)}
              disabled={!canDelete}
              title={canDelete ? "Eliminar" : "No se puede eliminar: tiene reservas asociadas"}
            >
              <IconTrash className="size-4" />
            </Button>
          </div>
        )
      },
    },
  ]

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  })

  async function handleDelete() {
    if (!deletingPassenger) return
    setIsDeleting(true)
    const result = await deletePassenger(deletingPassenger.id, currentSlug)
    setIsDeleting(false)
    setDeletingPassenger(null)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success("Pasajero eliminado")
    router.refresh()
  }

  return (
    <>
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div className="flex items-center justify-between gap-4">
          <Input
            placeholder="Buscar por nombre o documento..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-sm"
          />
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">
              {table.getFilteredRowModel().rows.length} pasajero
              {table.getFilteredRowModel().rows.length !== 1 ? "s" : ""}
            </p>
            <Button size="sm" onClick={handleNewPassenger}>
              <IconPlus className="size-4" />
              Nuevo pasajero
            </Button>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((h) => (
                    <TableHead key={h.id}>
                      {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
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
                    {globalFilter ? "Sin resultados para la búsqueda." : "No hay pasajeros registrados."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {table.getState().pagination.pageIndex + 1} de {Math.max(table.getPageCount(), 1)}
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

      <PassengerSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open)
          if (!open) setEditingPassenger(null)
        }}
        passenger={editingPassenger}
        documentTypes={documentTypes}
        countries={countries}
        currentSlug={currentSlug}
      />

      <AlertDialog
        open={!!deletingPassenger}
        onOpenChange={(open) => { if (!open) setDeletingPassenger(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar pasajero?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar a{" "}
              <strong>
                {deletingPassenger?.firstName} {deletingPassenger?.lastName}
              </strong>
              . Esta acción no se puede deshacer.
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
