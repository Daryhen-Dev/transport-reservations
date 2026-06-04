"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { api, ApiError } from "@/lib/api/client"
import { TRANSFER_COMMISSION_PER_PAX, transferBreakdown } from "@/lib/pricing"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type ReservationSummary = {
  id: string
  seatCount: number
  priceAmount: string | null
  proveedor: {
    firstName: string | null
    lastName: string | null
    companyName: string | null
  }
}

type Agency = {
  id: string
  firstName: string | null
  lastName: string | null
  companyName: string | null
}

type Props = {
  reservation: ReservationSummary | null
  onOpenChange: (open: boolean) => void
}

function agencyLabel(a: Agency): string {
  return a.companyName ?? `${a.firstName ?? ""} ${a.lastName ?? ""}`.trim() ?? a.id
}

function proveedorLabel(p: ReservationSummary["proveedor"]): string {
  return p.companyName ?? `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() ?? "—"
}

function money(n: number): string {
  return `$${n.toFixed(2)}`
}

export function TransferToAgencySheet({ reservation, onOpenChange }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [agencyId, setAgencyId] = useState<string>("")
  const [loadingAgencies, setLoadingAgencies] = useState(false)

  const open = reservation !== null

  useEffect(() => {
    if (!open) {
      setAgencyId("")
      return
    }
    setLoadingAgencies(true)
    api.proveedores
      .list({ typeId: undefined })
      .then((all) =>
        setAgencies(
          all
            .filter((p) => p.proveedorType.name === "AGENCIA")
            .map((p) => ({
              id: p.id,
              firstName: p.firstName,
              lastName: p.lastName,
              companyName: p.companyName,
            }))
        )
      )
      .catch(() => toast.error("Error al cargar las agencias"))
      .finally(() => setLoadingAgencies(false))
  }, [open])

  if (!reservation) return null

  const priceAmount = reservation.priceAmount ? Number(reservation.priceAmount) : 0
  const breakdown = transferBreakdown(priceAmount, reservation.seatCount)

  function handleSubmit() {
    if (!reservation || !agencyId) return
    startTransition(async () => {
      try {
        await api.reservations.passengers.transfer(reservation.id, agencyId)
        toast.success("Reserva transferida")
        onOpenChange(false)
        router.refresh()
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : "Error al transferir la reserva"
        )
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Transferir reserva a otra agencia</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-5 px-4">
          <div className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Comprador original:</span>
            <span className="font-medium">{proveedorLabel(reservation.proveedor)}</span>
            <span className="text-muted-foreground">
              {reservation.seatCount} pasajero{reservation.seatCount !== 1 ? "s" : ""} · cobrado a ${priceAmount.toFixed(2)}/pax
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="transfer-agency">Agencia destino</Label>
            <Select value={agencyId} onValueChange={setAgencyId} disabled={loadingAgencies}>
              <SelectTrigger id="transfer-agency" className="w-full">
                <SelectValue placeholder={loadingAgencies ? "Cargando..." : "Seleccionar agencia"} />
              </SelectTrigger>
              <SelectContent>
                {agencies.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {agencyLabel(a)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!loadingAgencies && agencies.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No hay agencias cargadas. Creá un proveedor tipo AGENCIA primero.
              </p>
            )}
          </div>

          <div className="rounded-md border bg-muted/30 p-3 flex flex-col gap-2 text-sm">
            <p className="font-medium">Resumen monetario</p>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Le mandamos a la agencia:</span>
              <span className="font-medium">{money(breakdown.amountToAgency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Comisión que retenemos (${TRANSFER_COMMISSION_PER_PAX}/pax × {reservation.seatCount}):
              </span>
              <span className="font-medium">{money(breakdown.commissionEarned)}</span>
            </div>
            <p className="text-xs text-muted-foreground pt-1 border-t mt-1">
              La reserva pasa a estado <span className="font-semibold">TRANSFERIDA</span>. Es terminal — no se puede revertir.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!agencyId || isPending}
              className="flex-1"
            >
              {isPending ? "Transfiriendo..." : "Transferir"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
