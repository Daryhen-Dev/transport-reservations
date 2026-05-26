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
import { format } from "date-fns"
import { deleteCrewMember } from "@/app/actions/crew-member"
import { CrewMemberSheet } from "./crew-member-sheet"
import type { CrewMemberRow } from "@/lib/services/crew-member.service"

type DocumentType = { id: string; name: string }

export function CrewMembersTable({
  data,
  documentTypes,
  currentSlug,
}: {
  data: CrewMemberRow[]
  documentTypes: DocumentType[]
  currentSlug?: string
}) {
  const router = useRouter()
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const [editingMember, setEditingMember] = useState<CrewMemberRow | null>(null)
  const [deletingMember, setDeletingMember] = useState<CrewMemberRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const columns: ColumnDef<CrewMemberRow>[] = [
    {
      id: "fullName",
      header: "Tripulante",
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
      enableSorting: true,
    },
    {
      id: "document",
      header: "Documento",
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.documentType.name} · {row.original.documentNumber}
        </span>
      ),
    },
    {
      id: "birthDate",
      header: "Nacimiento",
      cell: ({ row }) =>
        row.original.birthDate
          ? format(new Date(row.original.birthDate), "dd/MM/yyyy")
          : <span className="text-muted-foreground/60 text-xs italic">—</span>,
    },
    {
      id: "trips",
      header: "Viajes",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original._count.trips}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setEditingMember(row.original)}
          >
            <IconEdit className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeletingMember(row.original)}
          >
            <IconTrash className="size-4" />
          </Button>
        </div>
      ),
    },
  ]

  const table = useReactTable({
    data,
    columns,
    state: { columnFilters, sorting },
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  })

  async function handleDelete() {
    if (!deletingMember) return
    setIsDeleting(true)
    const result = await deleteCrewMember(deletingMember.id, currentSlug ?? "")
    setIsDeleting(false)
    setDeletingMember(null)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success("Tripulante eliminado")
    router.refresh()
  }

  return (
    <>
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div className="flex items-center justify-between gap-4">
          <Input
            placeholder="Buscar tripulante..."
            value={(table.getColumn("fullName")?.getFilterValue() as string) ?? ""}
            onChange={(e) => table.getColumn("fullName")?.setFilterValue(e.target.value)}
            className="max-w-sm"
          />
          <CrewMemberSheet currentSlug={currentSlug} documentTypes={documentTypes} />
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
                    No hay tripulantes registrados.
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

      {/* Edit sheet (controlled) */}
      {editingMember && (
        <CrewMemberSheet
          currentSlug={currentSlug}
          documentTypes={documentTypes}
          crewMember={editingMember}
          open={!!editingMember}
          onOpenChange={(open) => { if (!open) setEditingMember(null) }}
          trigger={false}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deletingMember}
        onOpenChange={(open) => { if (!open) setDeletingMember(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tripulante?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar a{" "}
              <strong>
                {deletingMember?.firstName} {deletingMember?.lastName}
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
