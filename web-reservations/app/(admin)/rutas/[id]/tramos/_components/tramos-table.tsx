"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconEdit, IconTrash } from "@tabler/icons-react"
import { api, ApiError } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { TramoSheet, type SegmentRow, type Operator } from "./tramo-sheet"

type Props = {
  routeId: string
  segments: SegmentRow[]
  operators: Operator[]
}

function operatorName(op: SegmentRow["operatorProveedor"]) {
  if (!op) return "—"
  return op.companyName ?? `${op.firstName ?? ""} ${op.lastName ?? ""}`.trim()
}

export function TramosTable({ routeId, segments, operators }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState<SegmentRow | null>(null)
  const [deleting, setDeleting] = useState<SegmentRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  async function handleDelete() {
    if (!deleting) return
    setIsDeleting(true)
    try {
      await api.routeSegments.delete(deleting.id)
      toast.success("Tramo eliminado")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Error al eliminar")
    } finally {
      setIsDeleting(false)
      setDeleting(null)
    }
  }

  const nextPosition =
    segments.length === 0
      ? 1
      : Math.max(...segments.map((s) => s.position)) + 1

  return (
    <div className="px-4 lg:px-6 flex flex-col gap-4">
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => {
            setEditing(null)
            setSheetOpen(true)
          }}
        >
          Nuevo tramo
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Tramo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Operador</TableHead>
              <TableHead className="text-right">Costo externo</TableHead>
              <TableHead>Notas</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {segments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                  Sin tramos configurados — la ruta opera como un único trayecto.
                </TableCell>
              </TableRow>
            ) : (
              segments.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.position}</TableCell>
                  <TableCell>
                    <span className="font-medium">
                      {s.origin} → {s.destination}
                    </span>
                  </TableCell>
                  <TableCell>
                    {s.isExternal ? (
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                        Externo
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        Propio
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{operatorName(s.operatorProveedor)}</TableCell>
                  <TableCell className="text-right">
                    {s.externalCostAmount
                      ? `$${Number(s.externalCostAmount).toFixed(2)}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {s.notes ?? ""}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(s)
                          setSheetOpen(true)
                        }}
                      >
                        <IconEdit className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleting(s)}
                      >
                        <IconTrash className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <TramoSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        routeId={routeId}
        segment={editing}
        operators={operators}
        defaultPosition={nextPosition}
      />

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tramo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no afecta las reservas existentes en la ruta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
