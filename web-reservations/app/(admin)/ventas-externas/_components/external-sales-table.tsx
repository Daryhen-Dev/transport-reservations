"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconEdit, IconTrash, IconPlus } from "@tabler/icons-react"
import { api, ApiError, type ExternalSale } from "@/lib/api/client"
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
import { ExternalSaleSheet, type AgencyOption, type StatusOption } from "./external-sale-sheet"

type Props = {
  branchId: string
  data: ExternalSale[]
  agencies: AgencyOption[]
  reservationStatuses: StatusOption[]
}

function money(v: string): string {
  return `$${Number(v).toFixed(2)}`
}

function agencyDisplay(a: ExternalSale["operatorAgency"]): string {
  return a.companyName ?? `${a.firstName ?? ""} ${a.lastName ?? ""}`.trim() ?? a.id
}

function formatDateTime(s: string): string {
  return new Date(s).toLocaleString("es-AR", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function ExternalSalesTable({
  branchId,
  data,
  agencies,
  reservationStatuses,
}: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState<ExternalSale | null>(null)
  const [deleting, setDeleting] = useState<ExternalSale | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  async function handleDelete() {
    if (!deleting) return
    setIsDeleting(true)
    try {
      await api.externalSales.delete(deleting.id)
      toast.success("Venta eliminada")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Error al eliminar")
    } finally {
      setIsDeleting(false)
      setDeleting(null)
    }
  }

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
          <IconPlus className="size-4" />
          Nueva venta externa
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha viaje</TableHead>
              <TableHead>Ruta</TableHead>
              <TableHead>Operador</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Pax</TableHead>
              <TableHead className="text-right">Cobrado</TableHead>
              <TableHead className="text-right">Pagado</TableHead>
              <TableHead className="text-right">Margen</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-6">
                  No hay ventas externas registradas.
                </TableCell>
              </TableRow>
            ) : (
              data.map((s) => {
                const margin =
                  Number(s.priceCharged) - Number(s.costPaidToOperator)
                return (
                  <TableRow key={s.id}>
                    <TableCell className="text-sm">
                      {formatDateTime(s.departureAt)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {s.origin} → {s.destination}
                    </TableCell>
                    <TableCell>{agencyDisplay(s.operatorAgency)}</TableCell>
                    <TableCell className="text-sm">
                      {s.buyerName ?? "—"}
                      {s.buyerDocument && (
                        <span className="text-xs text-muted-foreground block">
                          {s.buyerDocument}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{s.passengerCount}</TableCell>
                    <TableCell className="text-right">{money(s.priceCharged)}</TableCell>
                    <TableCell className="text-right">
                      {money(s.costPaidToOperator)}
                    </TableCell>
                    <TableCell
                      className={`text-right ${margin < 0 ? "text-destructive" : ""}`}
                    >
                      ${margin.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100">
                        {s.reservationStatus.name}
                      </span>
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
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <ExternalSaleSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        branchId={branchId}
        sale={editing}
        agencies={agencies}
        reservationStatuses={reservationStatuses}
      />

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar venta externa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
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
