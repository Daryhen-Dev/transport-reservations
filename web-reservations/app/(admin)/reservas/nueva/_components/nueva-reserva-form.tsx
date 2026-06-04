"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { parseISO, startOfDay, isToday, isBefore } from "date-fns"
import { formatDateWithWeekday } from "@/lib/format-date"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Autocomplete } from "@/components/ui/autocomplete"
import { api, ApiError, type Proveedor as ProveedorWithRelations } from "@/lib/api/client"
import {
  PRICE_LIBRE_MAX,
  PRICE_LIBRE_MIN,
  PRICE_NORMAL,
  PRICE_REFERIDOS,
  COMMISSION_PER_PAX,
  allowedPriceTypesForProveedor,
  defaultPriceTypeForProveedor,
  isPriceTypeLockedForProveedor,
  type PriceType,
} from "@/lib/pricing"
import { QuickProveedorSheet } from "./quick-proveedor-sheet"

export type TripScheduleWithRoute = {
  id: string
  routeId: string
  time: string
  isActive: boolean
  route: {
    id: string
    origin: string
    destination: string
    branchId: string
  }
}

type ProveedorType = {
  id: string
  name: string
}

type DocumentType = {
  id: string
  name: string
}

type ProveedorResult = {
  id: string
  firstName: string | null
  lastName: string | null
  companyName: string | null
  documentNumber: string | null
  proveedorType: { id: string; name: string } | null
  documentType: { id: string; name: string } | null
}

type Props = {
  fecha: string | null
  schedules: TripScheduleWithRoute[]
  proveedorTypes: ProveedorType[]
  documentTypes: DocumentType[]
  slug?: string
  branchId: string
}

function formatScheduleLabel(schedule: TripScheduleWithRoute): string {
  return `${schedule.time} — ${schedule.route.origin} → ${schedule.route.destination}`
}

function formatFecha(fecha: string): string {
  try {
    return formatDateWithWeekday(fecha)
  } catch {
    return fecha
  }
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function formatProveedorTypeName(name: string): string {
  // El nombre se guarda en BD como UPPER_SNAKE. Lo mostramos limpio.
  return name
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase())
}

function priceTypeLabel(type: PriceType): string {
  switch (type) {
    case "NORMAL":
      return `Normal — $${PRICE_NORMAL} fijo`
    case "REFERIDOS":
      return `Referidos — $${PRICE_REFERIDOS} fijo ($${COMMISSION_PER_PAX}/pax a la agencia)`
    case "LIBRE":
      return `Libre — $${PRICE_LIBRE_MIN} a $${PRICE_LIBRE_MAX}`
  }
}

function getProveedorDisplayValue(p: ProveedorResult | ProveedorWithRelations): string {
  const name = p.firstName
    ? `${p.firstName} ${p.lastName ?? ""}`.trim()
    : (p.companyName ?? "")
  const doc =
    p.documentType?.name && p.documentNumber
      ? ` — ${p.documentType.name} ${p.documentNumber}`
      : ""
  return `${name}${doc}`
}

export function NuevaReservaForm({ fecha, schedules, proveedorTypes, documentTypes, slug, branchId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const fechaDate = fecha ? parseISO(fecha) : null
  const isFechaInPast = fechaDate ? isBefore(startOfDay(fechaDate), startOfDay(new Date())) : false
  const isFechaToday = fechaDate ? isToday(fechaDate) : false

  function isTimePast(time: string): boolean {
    const [h, m] = time.split(":").map(Number)
    const now = new Date()
    return h < now.getHours() || (h === now.getHours() && m <= now.getMinutes())
  }

  const availableSchedules = isFechaToday
    ? schedules.filter((s) => !isTimePast(s.time))
    : schedules

  const defaultPersonaType = proveedorTypes.find((pt) =>
    pt.name.toLowerCase().includes("persona")
  )

  const [scheduleId, setScheduleId] = useState<string>("")
  const [proveedorTypeId, setProveedorTypeId] = useState<string | null>(defaultPersonaType?.id ?? null)
  const [proveedorTypeName, setProveedorTypeName] = useState<string | null>(defaultPersonaType?.name ?? null)
  const [selectedProveedor, setSelectedProveedor] = useState<ProveedorResult | null>(null)
  const [proveedorDisplayValue, setProveedorDisplayValue] = useState<string>("")
  const [seatCount, setSeatCount] = useState<number>(1)
  const [asPending, setAsPending] = useState<boolean>(false)
  const [quickSheetOpen, setQuickSheetOpen] = useState(false)
  const [priceType, setPriceType] = useState<PriceType>(defaultPriceTypeForProveedor(defaultPersonaType?.name))
  const [librePrice, setLibrePrice] = useState<number>(PRICE_LIBRE_MIN)

  const allowedTypes = allowedPriceTypesForProveedor(proveedorTypeName)
  const priceLocked = isPriceTypeLockedForProveedor(proveedorTypeName)

  useEffect(() => {
    if (!allowedTypes.includes(priceType)) {
      setPriceType(defaultPriceTypeForProveedor(proveedorTypeName))
    }
  }, [allowedTypes, priceType, proveedorTypeName])

  const effectivePrice =
    priceType === "LIBRE"
      ? librePrice
      : priceType === "REFERIDOS"
        ? PRICE_REFERIDOS
        : PRICE_NORMAL

  const libreInvalid =
    priceType === "LIBRE" &&
    (librePrice < PRICE_LIBRE_MIN || librePrice > PRICE_LIBRE_MAX)

  const isFormComplete =
    !isFechaInPast &&
    scheduleId !== "" &&
    proveedorTypeId !== null &&
    selectedProveedor !== null &&
    seatCount >= 1 &&
    !libreInvalid

  function handleProveedorTypeChange(value: string) {
    const found = proveedorTypes.find((pt) => pt.id === value)
    const newName = found?.name ?? null
    setProveedorTypeId(value)
    setProveedorTypeName(newName)
    setSelectedProveedor(null)
    setProveedorDisplayValue("")
    setPriceType(defaultPriceTypeForProveedor(newName))
  }

  function handleSubmit() {
    if (!isFormComplete || !selectedProveedor || !fecha) return

    startTransition(async () => {
      try {
        await api.reservations.passengers.createQuick({
          scheduleId,
          date: fecha,
          proveedorId: selectedProveedor.id,
          seatCount,
          branchId,
          isPending: asPending,
          priceType,
          priceAmount: priceType === "LIBRE" ? librePrice : undefined,
        })
        toast.success("Reserva creada exitosamente")
        router.push(`/reservas`)
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Error al crear la reserva"
        toast.error(message)
      }
    })
  }

  return (
    <div className="px-4 lg:px-6">
      <div className="max-w-lg flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Label>Fecha</Label>
          <p className="text-sm font-medium">
            {fecha ? capitalizeFirst(formatFecha(fecha)) : "Sin fecha seleccionada"}
          </p>
          {isFechaInPast && (
            <p className="text-sm text-destructive">
              No se pueden crear reservas para fechas pasadas.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="scheduleId">Horario</Label>
          {schedules.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay horarios configurados para esta sucursal
            </p>
          ) : availableSchedules.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todos los horarios de hoy ya pasaron.
            </p>
          ) : (
            <Select onValueChange={setScheduleId} value={scheduleId}>
              <SelectTrigger id="scheduleId" className="w-full">
                <SelectValue placeholder="Seleccionar horario" />
              </SelectTrigger>
              <SelectContent>
                {availableSchedules.map((schedule) => (
                  <SelectItem key={schedule.id} value={schedule.id}>
                    {formatScheduleLabel(schedule)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="proveedorTypeId">Tipo de Proveedor</Label>
          <Select
            onValueChange={handleProveedorTypeChange}
            value={proveedorTypeId ?? ""}
          >
            <SelectTrigger id="proveedorTypeId" className="w-full">
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              {proveedorTypes.map((pt) => (
                <SelectItem key={pt.id} value={pt.id}>
                  {formatProveedorTypeName(pt.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Proveedor</Label>
          <Autocomplete<ProveedorResult>
            searchFn={(query) =>
              api.proveedores.search(query, proveedorTypeId ?? undefined).then((results) =>
                results.map((p) => ({
                  id: p.id,
                  firstName: p.firstName,
                  lastName: p.lastName,
                  companyName: p.companyName,
                  documentNumber: p.documentNumber,
                  proveedorType: p.proveedorType ? { id: p.proveedorType.id, name: p.proveedorType.name } : null,
                  documentType: p.documentType ? { id: p.documentType.id, name: p.documentType.name } : null,
                }))
              )
            }
            displayFn={getProveedorDisplayValue}
            value={proveedorDisplayValue}
            onSelect={(p) => {
              setSelectedProveedor(p)
              setProveedorDisplayValue(p ? getProveedorDisplayValue(p) : "")
            }}
            placeholder="Buscar proveedor..."
            disabled={!proveedorTypeId}
            onAddNew={() => setQuickSheetOpen(true)}
            addNewLabel="Agregar nuevo proveedor"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="seatCount">Cantidad de pasajeros</Label>
          <Input
            id="seatCount"
            type="number"
            min={1}
            value={seatCount}
            onChange={(e) => setSeatCount(Number(e.target.value))}
            className="w-32"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="priceType">Tipo de precio</Label>
          <Select
            value={priceType}
            onValueChange={(val) => setPriceType(val as PriceType)}
            disabled={priceLocked}
          >
            <SelectTrigger id="priceType" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allowedTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {priceTypeLabel(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {priceLocked && (
            <p className="text-xs text-muted-foreground">
              Bloqueado: los proveedores tipo Agencia siempre son Referidos.
            </p>
          )}
        </div>

        {priceType === "LIBRE" ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="librePrice">Precio cobrado (USD)</Label>
            <Input
              id="librePrice"
              type="number"
              step="0.01"
              min={PRICE_LIBRE_MIN}
              max={PRICE_LIBRE_MAX}
              value={librePrice}
              onChange={(e) => setLibrePrice(Number(e.target.value))}
              className="w-40"
            />
            <p className="text-xs text-muted-foreground">
              Rango permitido: ${PRICE_LIBRE_MIN} a ${PRICE_LIBRE_MAX}.
            </p>
            {libreInvalid && (
              <p className="text-sm text-destructive">
                El precio LIBRE debe estar entre ${PRICE_LIBRE_MIN} y ${PRICE_LIBRE_MAX}.
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Label>Precio cobrado (USD)</Label>
            <p className="text-sm font-medium">${effectivePrice.toFixed(2)}</p>
            {priceType === "REFERIDOS" && (
              <p className="text-xs text-muted-foreground">
                Comisión a la agencia: ${COMMISSION_PER_PAX} × {seatCount} = ${(COMMISSION_PER_PAX * seatCount).toFixed(2)}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Checkbox
            id="isPending"
            checked={asPending}
            onCheckedChange={(v) => setAsPending(v === true)}
          />
          <Label htmlFor="isPending" className="font-normal cursor-pointer">
            Crear como pendiente
          </Label>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!isFormComplete || isPending || availableSchedules.length === 0}
          className="w-fit"
        >
          {isPending ? "Creando..." : "Crear Reserva"}
        </Button>
      </div>

      <QuickProveedorSheet
        open={quickSheetOpen}
        onOpenChange={setQuickSheetOpen}
        proveedorTypeId={proveedorTypeId}
        proveedorTypeName={proveedorTypeName}
        documentTypes={documentTypes}
        onCreated={(proveedor) => {
          const display = getProveedorDisplayValue(proveedor)
          setSelectedProveedor({
            id: proveedor.id,
            firstName: proveedor.firstName,
            lastName: proveedor.lastName,
            companyName: proveedor.companyName,
            documentNumber: proveedor.documentNumber,
            proveedorType: proveedor.proveedorType
              ? { id: proveedor.proveedorType.id, name: proveedor.proveedorType.name }
              : null,
            documentType: proveedor.documentType
              ? { id: proveedor.documentType.id, name: proveedor.documentType.name }
              : null,
          })
          setProveedorDisplayValue(display)
          setQuickSheetOpen(false)
        }}
      />
    </div>
  )
}
