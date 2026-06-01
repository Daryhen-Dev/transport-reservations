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
import { TariffSheet, type TariffRow, type RouteOption } from "./tariff-sheet"

type Props = {
  proveedorId: string
  tariffs: TariffRow[]
  routes: RouteOption[]
}

function fmtPrice(v: string | null, fallback: string): string {
  if (v === null) return `(${Number(fallback).toFixed(2)})`
  return `$${Number(v).toFixed(2)}`
}

export function TarifasTable({ proveedorId, tariffs, routes }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState<TariffRow | null>(null)
  const [deleting, setDeleting] = useState<TariffRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  const usedRouteIds = new Set(tariffs.map((t) => t.route.id))
  const availableRoutes = routes.filter((r) => !usedRouteIds.has(r.id))

  async function handleDelete() {
    if (!deleting) return
    setIsDeleting(true)
    try {
      await api.proveedorTariffs.delete(deleting.id)
      toast.success("Tarifa eliminada")
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
          disabled={availableRoutes.length === 0}
        >
          Nueva tarifa
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ruta</TableHead>
              <TableHead className="text-right">Directo</TableHead>
              <TableHead className="text-right">Desde agencia</TableHead>
              <TableHead className="text-right">Comisión</TableHead>
              <TableHead className="text-right">Mínimo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tariffs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                  Sin tarifas personalizadas — se aplican los precios estándar.
                </TableCell>
              </TableRow>
            ) : (
              tariffs.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {t.route.origin} → {t.route.destination}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {t.route.branchName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {fmtPrice(t.directPriceAmount, t.route.directPriceAmount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {fmtPrice(
                      t.incomingAgencyPriceAmount,
                      t.route.incomingAgencyPriceAmount
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {fmtPrice(
                      t.outgoingCommissionAmount,
                      t.route.outgoingCommissionAmount
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {fmtPrice(t.minPrice, t.route.minPrice)}
                  </TableCell>
                  <TableCell>
                    {t.isActive ? (
                      <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        Activa
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                        Inactiva
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(t)
                          setSheetOpen(true)
                        }}
                      >
                        <IconEdit className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleting(t)}
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

      <p className="text-xs text-muted-foreground">
        Valor en paréntesis: precio estándar de la ruta (se aplica si no hay
        override).
      </p>

      <TariffSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        proveedorId={proveedorId}
        tariff={editing}
        availableRoutes={availableRoutes}
      />

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tarifa?</AlertDialogTitle>
            <AlertDialogDescription>
              Las reservas existentes no se modifican. Las nuevas reservas
              pasarán a usar el precio estándar de la ruta.
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
