"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { parseISO, format, startOfDay, isToday, isBefore } from "date-fns"
import { es } from "date-fns/locale"
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
import { QuickProveedorSheet } from "./quick-proveedor-sheet"

import type { TripSchedule, Route } from "@/lib/generated/prisma/client"

type TripScheduleWithRoute = TripSchedule & { route: Route }

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

type Agency = {
  id: string
  firstName: string | null
  lastName: string | null
  companyName: string | null
}

type Props = {
  fecha: string | null
  schedules: TripScheduleWithRoute[]
  proveedorTypes: ProveedorType[]
  documentTypes: DocumentType[]
  slug?: string
  branchId: string
  agencies: Agency[]
}

function agencyLabel(a: Agency) {
  return a.companyName ?? `${a.firstName ?? ""} ${a.lastName ?? ""}`.trim() ?? a.id
}

function asNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

type SalesChannel = "DIRECT" | "FROM_AGENCY" | "TO_AGENCY"

function formatScheduleLabel(schedule: TripScheduleWithRoute): string {
  return `${schedule.time} — ${schedule.route.origin} → ${schedule.route.destination}`
}

function formatFecha(fecha: string): string {
  try {
    return format(parseISO(fecha), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
  } catch {
    return fecha
  }
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
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

export function NuevaReservaForm({ fecha, schedules, proveedorTypes, documentTypes, slug, branchId, agencies }: Props) {
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
  const [salesChannel, setSalesChannel] = useState<SalesChannel>("DIRECT")
  const [externalAgencyId, setExternalAgencyId] = useState<string>("")
  const [priceAmount, setPriceAmount] = useState<number>(0)
  const [priceDirty, setPriceDirty] = useState<boolean>(false)

  const selectedSchedule = availableSchedules.find((s) => s.id === scheduleId)
  const directPrice = asNumber(selectedSchedule?.route.directPriceAmount)
  const incomingPrice = asNumber(selectedSchedule?.route.incomingAgencyPriceAmount)
  const minPrice = asNumber(selectedSchedule?.route.minPrice)
  const suggested =
    salesChannel === "FROM_AGENCY" ? incomingPrice : directPrice

  // Auto-fill price when the route/channel changes and the user hasn't touched it.
  useEffect(() => {
    if (!priceDirty && suggested !== null) {
      setPriceAmount(suggested)
    }
  }, [suggested, priceDirty])

  const isFormComplete =
    !isFechaInPast &&
    scheduleId !== "" &&
    proveedorTypeId !== null &&
    selectedProveedor !== null &&
    seatCount >= 1 &&
    priceAmount > 0 &&
    (salesChannel === "DIRECT" || externalAgencyId !== "") &&
    (minPrice === null || priceAmount >= minPrice)

  function handleProveedorTypeChange(value: string) {
    const found = proveedorTypes.find((pt) => pt.id === value)
    setProveedorTypeId(value)
    setProveedorTypeName(found?.name ?? null)
    setSelectedProveedor(null)
    setProveedorDisplayValue("")
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
          priceAmount,
          salesChannel,
          externalAgencyId:
            salesChannel === "DIRECT" ? null : externalAgencyId || null,
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
        {/* Fecha (read-only) */}
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

        {/* Horario */}
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

        {/* Tipo de Proveedor */}
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
                  {pt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Proveedor autocomplete */}
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

        {/* Cantidad de pasajeros */}
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

        {/* Canal de venta */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="salesChannel">Canal de venta</Label>
          <Select
            value={salesChannel}
            onValueChange={(val) => setSalesChannel(val as SalesChannel)}
          >
            <SelectTrigger id="salesChannel" className="w-full">
              <SelectValue placeholder="Seleccionar canal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DIRECT">Directo</SelectItem>
              <SelectItem value="FROM_AGENCY">Desde agencia externa</SelectItem>
              <SelectItem value="TO_AGENCY">Con comisión a agencia</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {salesChannel !== "DIRECT" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="externalAgencyId">Agencia externa</Label>
            <Select
              value={externalAgencyId}
              onValueChange={setExternalAgencyId}
            >
              <SelectTrigger id="externalAgencyId" className="w-full">
                <SelectValue placeholder="Seleccionar agencia" />
              </SelectTrigger>
              <SelectContent>
                {agencies.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No hay agencias registradas
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
        )}

        {/* Precio cobrado */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="priceAmount">Precio cobrado (USD)</Label>
          <Input
            id="priceAmount"
            type="number"
            step="0.01"
            min={0}
            value={priceAmount}
            onChange={(e) => {
              setPriceAmount(Number(e.target.value))
              setPriceDirty(true)
            }}
            className="w-40"
          />
          <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
            {suggested !== null && (
              <span>Precio sugerido: ${suggested.toFixed(2)}</span>
            )}
            {minPrice !== null && (
              <span>Precio mínimo permitido: ${minPrice.toFixed(2)}</span>
            )}
          </div>
          {minPrice !== null && priceAmount < minPrice && (
            <p className="text-sm text-destructive">
              El precio no puede ser menor al mínimo.
            </p>
          )}
        </div>

        {/* Estado */}
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

        {/* Submit */}
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
