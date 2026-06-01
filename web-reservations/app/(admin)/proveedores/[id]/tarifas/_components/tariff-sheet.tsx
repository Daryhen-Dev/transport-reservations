"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { api, ApiError } from "@/lib/api/client"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type RouteOption = {
  id: string
  origin: string
  destination: string
  branchName: string
  directPriceAmount: string
  incomingAgencyPriceAmount: string
  outgoingCommissionAmount: string
  minPrice: string
}

export type TariffRow = {
  id: string
  isActive: boolean
  notes: string | null
  directPriceAmount: string | null
  incomingAgencyPriceAmount: string | null
  outgoingCommissionAmount: string | null
  minPrice: string | null
  route: RouteOption
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  proveedorId: string
  tariff: TariffRow | null
  availableRoutes: RouteOption[]
}

function parseOptionalNumber(s: string): number | null {
  if (s === "") return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export function TariffSheet({
  open,
  onOpenChange,
  proveedorId,
  tariff,
  availableRoutes,
}: Props) {
  const router = useRouter()
  const isEdit = tariff !== null

  const [routeId, setRouteId] = useState<string>("")
  const [directPrice, setDirectPrice] = useState<string>("")
  const [incoming, setIncoming] = useState<string>("")
  const [commission, setCommission] = useState<string>("")
  const [minP, setMinP] = useState<string>("")
  const [notes, setNotes] = useState<string>("")
  const [isActive, setIsActive] = useState<boolean>(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      if (tariff) {
        setRouteId(tariff.route.id)
        setDirectPrice(tariff.directPriceAmount ?? "")
        setIncoming(tariff.incomingAgencyPriceAmount ?? "")
        setCommission(tariff.outgoingCommissionAmount ?? "")
        setMinP(tariff.minPrice ?? "")
        setNotes(tariff.notes ?? "")
        setIsActive(tariff.isActive)
      } else {
        setRouteId("")
        setDirectPrice("")
        setIncoming("")
        setCommission("")
        setMinP("")
        setNotes("")
        setIsActive(true)
      }
    }
  }, [open, tariff])

  const selectedRoute =
    tariff?.route ?? availableRoutes.find((r) => r.id === routeId) ?? null

  async function handleSubmit() {
    if (!isEdit && !routeId) {
      toast.error("Seleccione una ruta")
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        directPriceAmount: parseOptionalNumber(directPrice),
        incomingAgencyPriceAmount: parseOptionalNumber(incoming),
        outgoingCommissionAmount: parseOptionalNumber(commission),
        minPrice: parseOptionalNumber(minP),
        notes: notes.trim() === "" ? null : notes.trim(),
        isActive,
      }
      if (isEdit && tariff) {
        await api.proveedorTariffs.update(tariff.id, payload)
        toast.success("Tarifa actualizada")
      } else {
        await api.proveedorTariffs.create({
          proveedorId,
          routeId,
          ...payload,
        })
        toast.success("Tarifa creada")
      }
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Error al guardar")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar tarifa" : "Nueva tarifa"}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-8">
          {/* Ruta */}
          <div className="flex flex-col gap-1.5">
            <Label>Ruta</Label>
            {isEdit ? (
              <p className="text-sm text-muted-foreground">
                {tariff!.route.origin} → {tariff!.route.destination} ·{" "}
                {tariff!.route.branchName}
              </p>
            ) : (
              <Select value={routeId} onValueChange={setRouteId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar ruta" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoutes.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      Todas las rutas ya tienen tarifa configurada
                    </div>
                  ) : (
                    availableRoutes.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.origin} → {r.destination} ({r.branchName})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedRoute && (
            <p className="text-xs text-muted-foreground -mt-2">
              Precios estándar: directo ${Number(selectedRoute.directPriceAmount).toFixed(2)} ·
              desde agencia ${Number(selectedRoute.incomingAgencyPriceAmount).toFixed(2)} ·
              comisión ${Number(selectedRoute.outgoingCommissionAmount).toFixed(2)} ·
              mínimo ${Number(selectedRoute.minPrice).toFixed(2)}
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Dejá vacío cualquier campo para usar el valor estándar de la ruta.
          </p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="direct">Precio directo (USD)</Label>
            <Input
              id="direct"
              type="number"
              step="0.01"
              min={0}
              value={directPrice}
              onChange={(e) => setDirectPrice(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="incoming">Precio desde agencia (USD)</Label>
            <Input
              id="incoming"
              type="number"
              step="0.01"
              min={0}
              value={incoming}
              onChange={(e) => setIncoming(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="commission">Comisión a agencia (USD)</Label>
            <Input
              id="commission"
              type="number"
              step="0.01"
              min={0}
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="min">Precio mínimo (USD)</Label>
            <Input
              id="min"
              type="number"
              step="0.01"
              min={0}
              value={minP}
              onChange={(e) => setMinP(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Acuerdo verbal, vigencia, etc."
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="isActive"
              checked={isActive}
              onCheckedChange={(v) => setIsActive(v === true)}
            />
            <Label htmlFor="isActive" className="font-normal cursor-pointer">
              Tarifa activa
            </Label>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting || (!isEdit && !routeId)}
          >
            {submitting
              ? "Guardando..."
              : isEdit
                ? "Guardar cambios"
                : "Crear tarifa"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
