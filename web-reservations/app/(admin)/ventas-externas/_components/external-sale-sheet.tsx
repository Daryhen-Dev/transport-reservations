"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { api, ApiError, type ExternalSale } from "@/lib/api/client"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type AgencyOption = {
  id: string
  firstName: string | null
  lastName: string | null
  companyName: string | null
}

export type StatusOption = { id: string; name: string }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  branchId: string
  sale: ExternalSale | null
  agencies: AgencyOption[]
  reservationStatuses: StatusOption[]
}

function agencyLabel(a: AgencyOption): string {
  return a.companyName ?? `${a.firstName ?? ""} ${a.lastName ?? ""}`.trim() ?? a.id
}

function toLocalDatetime(iso: string): string {
  // YYYY-MM-DDTHH:mm para <input type="datetime-local">
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function ExternalSaleSheet({
  open,
  onOpenChange,
  branchId,
  sale,
  agencies,
  reservationStatuses,
}: Props) {
  const router = useRouter()
  const isEdit = sale !== null

  const confirmadaStatus = reservationStatuses.find((s) => s.name === "CONFIRMADA")

  const [operatorAgencyId, setOperatorAgencyId] = useState("")
  const [buyerName, setBuyerName] = useState("")
  const [buyerDocument, setBuyerDocument] = useState("")
  const [buyerPhone, setBuyerPhone] = useState("")
  const [departureAt, setDepartureAt] = useState("")
  const [origin, setOrigin] = useState("")
  const [destination, setDestination] = useState("")
  const [passengerCount, setPassengerCount] = useState(1)
  const [priceCharged, setPriceCharged] = useState(0)
  const [costPaidToOperator, setCostPaidToOperator] = useState(0)
  const [reservationStatusId, setReservationStatusId] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      if (sale) {
        setOperatorAgencyId(sale.operatorAgencyId)
        setBuyerName(sale.buyerName ?? "")
        setBuyerDocument(sale.buyerDocument ?? "")
        setBuyerPhone(sale.buyerPhone ?? "")
        setDepartureAt(toLocalDatetime(sale.departureAt))
        setOrigin(sale.origin)
        setDestination(sale.destination)
        setPassengerCount(sale.passengerCount)
        setPriceCharged(Number(sale.priceCharged))
        setCostPaidToOperator(Number(sale.costPaidToOperator))
        setReservationStatusId(sale.reservationStatus.id)
        setNotes(sale.notes ?? "")
      } else {
        setOperatorAgencyId("")
        setBuyerName("")
        setBuyerDocument("")
        setBuyerPhone("")
        setDepartureAt("")
        setOrigin("")
        setDestination("")
        setPassengerCount(1)
        setPriceCharged(0)
        setCostPaidToOperator(0)
        setReservationStatusId(confirmadaStatus?.id ?? "")
        setNotes("")
      }
    }
  }, [open, sale, confirmadaStatus])

  const margin = priceCharged - costPaidToOperator

  async function handleSubmit() {
    if (!operatorAgencyId) {
      toast.error("Seleccioná la agencia operadora")
      return
    }
    if (!departureAt) {
      toast.error("Fecha de viaje requerida")
      return
    }
    if (!origin.trim() || !destination.trim()) {
      toast.error("Completá origen y destino")
      return
    }
    if (priceCharged <= 0) {
      toast.error("El precio cobrado debe ser mayor a 0")
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        operatorAgencyId,
        buyerName: buyerName.trim() === "" ? null : buyerName.trim(),
        buyerDocument: buyerDocument.trim() === "" ? null : buyerDocument.trim(),
        buyerPhone: buyerPhone.trim() === "" ? null : buyerPhone.trim(),
        departureAt: new Date(departureAt).toISOString(),
        origin: origin.trim(),
        destination: destination.trim(),
        passengerCount,
        priceCharged,
        costPaidToOperator,
        reservationStatusId: reservationStatusId || undefined,
        notes: notes.trim() === "" ? null : notes.trim(),
      }
      if (isEdit && sale) {
        await api.externalSales.update(sale.id, payload)
        toast.success("Venta actualizada")
      } else {
        await api.externalSales.create({ branchId, ...payload })
        toast.success("Venta creada")
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
          <SheetTitle>
            {isEdit ? "Editar venta externa" : "Nueva venta externa"}
          </SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-8">
          {/* Operador */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="operator">Agencia operadora</Label>
            <Select value={operatorAgencyId} onValueChange={setOperatorAgencyId}>
              <SelectTrigger id="operator" className="w-full">
                <SelectValue placeholder="Seleccionar agencia" />
              </SelectTrigger>
              <SelectContent>
                {agencies.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No hay proveedores AGENCIA registrados
                  </div>
                ) : (
                  agencies.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {agencyLabel(a)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Viaje */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="departureAt">Fecha y hora del viaje</Label>
            <Input
              id="departureAt"
              type="datetime-local"
              value={departureAt}
              onChange={(e) => setDepartureAt(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <div className="flex flex-col gap-1.5 flex-1">
              <Label htmlFor="origin">Origen</Label>
              <Input
                id="origin"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="San Cristóbal"
              />
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <Label htmlFor="destination">Destino</Label>
              <Input
                id="destination"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Isabela"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="passengerCount">Cantidad de pasajeros</Label>
            <Input
              id="passengerCount"
              type="number"
              min={1}
              value={passengerCount}
              onChange={(e) => setPassengerCount(Number(e.target.value))}
              className="w-32"
            />
          </div>

          {/* Cliente */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">Cliente (opcional)</p>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="buyerName">Nombre</Label>
                <Input
                  id="buyerName"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Juan Pérez"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex flex-col gap-1.5 flex-1">
                  <Label htmlFor="buyerDocument">Documento</Label>
                  <Input
                    id="buyerDocument"
                    value={buyerDocument}
                    onChange={(e) => setBuyerDocument(e.target.value)}
                    placeholder="V-12345678"
                  />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <Label htmlFor="buyerPhone">Teléfono</Label>
                  <Input
                    id="buyerPhone"
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    placeholder="+54 9 11 1234 5678"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">Precios</p>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="priceCharged">Cobrado al cliente (USD)</Label>
                <Input
                  id="priceCharged"
                  type="number"
                  step="0.01"
                  min={0}
                  value={priceCharged}
                  onChange={(e) => setPriceCharged(Number(e.target.value))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="costPaid">Pagado al operador (USD)</Label>
                <Input
                  id="costPaid"
                  type="number"
                  step="0.01"
                  min={0}
                  value={costPaidToOperator}
                  onChange={(e) => setCostPaidToOperator(Number(e.target.value))}
                />
              </div>
              <p
                className={`text-sm ${margin < 0 ? "text-destructive" : "text-muted-foreground"}`}
              >
                Margen estimado: ${margin.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="status">Estado</Label>
            <Select value={reservationStatusId} onValueChange={setReservationStatusId}>
              <SelectTrigger id="status" className="w-full">
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                {reservationStatuses.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contacto, referencia, etc."
            />
          </div>

          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting
              ? "Guardando..."
              : isEdit
                ? "Guardar cambios"
                : "Crear venta"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
