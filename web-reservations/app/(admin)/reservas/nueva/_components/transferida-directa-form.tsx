"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { parseISO, startOfDay, isToday, isBefore } from "date-fns"
import { formatDateWithWeekday } from "@/lib/format-date"
import { IconTrash } from "@tabler/icons-react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
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
  PRICE_NORMAL,
  TRANSFER_COMMISSION_PER_PAX,
  transferBreakdown,
} from "@/lib/pricing"
import { QuickProveedorSheet } from "./quick-proveedor-sheet"
import { QuickPassengerCreateSheet } from "./quick-passenger-create-sheet"
import type { TripScheduleWithRoute } from "./nueva-reserva-form"

type ProveedorType = { id: string; name: string }
type DocumentType = { id: string; name: string }
type Country = { id: string; name: string }

type ProveedorResult = {
  id: string
  firstName: string | null
  lastName: string | null
  companyName: string | null
  documentNumber: string | null
  proveedorType: { id: string; name: string } | null
  documentType: { id: string; name: string } | null
}

type SelectedPassenger = {
  id: string
  firstName: string
  lastName: string
  documentType: { id: string; name: string }
  documentNumber: string
  country: { id: string; name: string }
  birthDate: string | null
}

type Props = {
  fecha: string | null
  schedules: TripScheduleWithRoute[]
  proveedorTypes: ProveedorType[]
  documentTypes: DocumentType[]
  countries: Country[]
  slug?: string
  branchId: string
}

function formatScheduleLabel(schedule: TripScheduleWithRoute): string {
  return `${schedule.time} — ${schedule.route.origin} → ${schedule.route.destination}`
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function formatProveedorTypeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase())
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

function getPassengerDisplayValue(p: SelectedPassenger): string {
  const name = `${p.firstName} ${p.lastName}`
  const doc = p.documentType ? ` — ${p.documentType.name} ${p.documentNumber}` : ""
  return `${name}${doc}`
}

export function TransferidaDirectaForm({
  fecha,
  schedules,
  proveedorTypes,
  documentTypes,
  countries,
  branchId,
}: Props) {
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

  // Solo PERSONA o INSTITUCION_PUBLICA pueden ser comprador en transferencias.
  const buyerTypes = proveedorTypes.filter((pt) => pt.name !== "AGENCIA")
  const agenciaType = proveedorTypes.find((pt) => pt.name === "AGENCIA")
  const defaultBuyerType = buyerTypes.find((pt) => pt.name === "PERSONA") ?? buyerTypes[0]

  const [scheduleId, setScheduleId] = useState<string>("")
  const [proveedorTypeId, setProveedorTypeId] = useState<string | null>(defaultBuyerType?.id ?? null)
  const [proveedorTypeName, setProveedorTypeName] = useState<string | null>(defaultBuyerType?.name ?? null)
  const [selectedProveedor, setSelectedProveedor] = useState<ProveedorResult | null>(null)
  const [proveedorDisplayValue, setProveedorDisplayValue] = useState<string>("")
  const [selectedDestino, setSelectedDestino] = useState<ProveedorResult | null>(null)
  const [destinoDisplayValue, setDestinoDisplayValue] = useState<string>("")
  const [passengers, setPassengers] = useState<SelectedPassenger[]>([])
  const [passengerSearchValue, setPassengerSearchValue] = useState<string>("")
  const [quickProveedorOpen, setQuickProveedorOpen] = useState<"buyer" | "destino" | null>(null)
  const [quickPassengerOpen, setQuickPassengerOpen] = useState(false)

  const seatCount = passengers.length
  const breakdown = transferBreakdown(PRICE_NORMAL, seatCount)

  function addPassenger(p: SelectedPassenger) {
    setPassengers((prev) => {
      if (prev.some((existing) => existing.id === p.id)) {
        toast.info("Ese pasajero ya está en la lista")
        return prev
      }
      return [...prev, p]
    })
    setPassengerSearchValue("")
  }

  const isFormComplete =
    !isFechaInPast &&
    scheduleId !== "" &&
    proveedorTypeId !== null &&
    selectedProveedor !== null &&
    selectedDestino !== null &&
    seatCount >= 1

  function handleProveedorTypeChange(value: string) {
    const found = proveedorTypes.find((pt) => pt.id === value)
    setProveedorTypeId(value)
    setProveedorTypeName(found?.name ?? null)
    setSelectedProveedor(null)
    setProveedorDisplayValue("")
  }

  function handleSubmit() {
    if (!isFormComplete || !selectedProveedor || !selectedDestino || !fecha) return
    startTransition(async () => {
      try {
        await api.reservations.passengers.createQuickTransferred({
          scheduleId,
          date: fecha,
          proveedorId: selectedProveedor.id,
          transferredToAgencyId: selectedDestino.id,
          seatCount,
          branchId,
          passengers: passengers.map((p) => ({
            firstName: p.firstName,
            lastName: p.lastName,
            documentTypeId: p.documentType.id,
            documentNumber: p.documentNumber,
            countryId: p.country.id,
            birthDate: p.birthDate ?? undefined,
          })),
        })
        toast.success("Reserva creada y transferida")
        router.push(`/reservas`)
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Error al crear la reserva transferida"
        toast.error(message)
      }
    })
  }

  if (!agenciaType) {
    return (
      <div className="px-4 lg:px-6">
        <p className="text-sm text-destructive">
          No se encontró el tipo de proveedor AGENCIA. Ejecutá el seed.
        </p>
      </div>
    )
  }

  return (
    <div className="px-4 lg:px-6">
      <div className="max-w-lg flex flex-col gap-5">
        <div className="rounded-md border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 p-3 text-sm">
          <p className="font-medium text-amber-900 dark:text-amber-200">Reserva transferida directa</p>
          <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
            Para cuando nuestro viaje está lleno y mandamos los pasajeros a una
            agencia socia. La reserva se crea ya en estado TRANSFERIDA. Registramos
            los datos de cada pasajero porque se los pasamos a la agencia destino.
          </p>
        </div>

        {/* Fecha */}
        <div className="flex flex-col gap-1.5">
          <Label>Fecha</Label>
          <p className="text-sm font-medium">
            {fecha ? capitalizeFirst(formatDateWithWeekday(fecha)) : "Sin fecha seleccionada"}
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

        {/* Tipo de proveedor (comprador) — sin AGENCIA */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="proveedorTypeId">Tipo de proveedor</Label>
          <Select onValueChange={handleProveedorTypeChange} value={proveedorTypeId ?? ""}>
            <SelectTrigger id="proveedorTypeId" className="w-full">
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              {buyerTypes.map((pt) => (
                <SelectItem key={pt.id} value={pt.id}>
                  {formatProveedorTypeName(pt.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Proveedor comprador */}
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
            onAddNew={() => setQuickProveedorOpen("buyer")}
            addNewLabel="Agregar nuevo proveedor"
          />
        </div>

        {/* Agencia destino */}
        <div className="flex flex-col gap-1.5">
          <Label>Agencia destino</Label>
          <Autocomplete<ProveedorResult>
            searchFn={(query) =>
              api.proveedores.search(query, agenciaType.id).then((results) =>
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
            value={destinoDisplayValue}
            onSelect={(p) => {
              setSelectedDestino(p)
              setDestinoDisplayValue(p ? getProveedorDisplayValue(p) : "")
            }}
            placeholder="Buscar agencia destino..."
            onAddNew={() => setQuickProveedorOpen("destino")}
            addNewLabel="Agregar nueva agencia"
          />
          <p className="text-xs text-muted-foreground">
            Agencia socia que ejecutará el viaje.
          </p>
        </div>

        {/* Pasajeros — autocomplete + crear */}
        <div className="flex flex-col gap-1.5">
          <Label>Pasajeros ({seatCount})</Label>
          <Autocomplete<SelectedPassenger>
            searchFn={(query) =>
              api.passengers.search(query).then((results) =>
                results.map((r) => ({
                  id: r.id,
                  firstName: r.firstName,
                  lastName: r.lastName,
                  documentType: r.documentType,
                  documentNumber: r.documentNumber,
                  country: r.country,
                  birthDate: r.birthDate,
                }))
              )
            }
            displayFn={getPassengerDisplayValue}
            value={passengerSearchValue}
            onSelect={(p) => {
              if (p) addPassenger(p)
            }}
            placeholder="Buscar pasajero por nombre o documento..."
            onAddNew={() => setQuickPassengerOpen(true)}
            addNewLabel="Crear nuevo pasajero"
          />
          {seatCount === 0 && (
            <p className="text-xs text-muted-foreground">
              Agregá al menos un pasajero. La cantidad define los asientos.
            </p>
          )}
        </div>

        {passengers.length > 0 && (
          <div className="flex flex-col gap-2">
            {passengers.map((p) => (
              <div
                key={p.id}
                className="flex items-start justify-between gap-2 rounded-md border p-3"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-medium">
                    {p.firstName} {p.lastName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {p.documentType?.name} {p.documentNumber}
                    {p.country ? ` · ${p.country.name}` : ""}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 text-destructive hover:text-destructive"
                  onClick={() =>
                    setPassengers((prev) => prev.filter((x) => x.id !== p.id))
                  }
                >
                  <IconTrash className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Resumen monetario */}
        <div className="flex flex-col gap-1.5">
          <Label>Resumen monetario</Label>
          <div className="rounded-md border bg-muted/30 p-3 text-sm flex flex-col gap-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Precio (fijo):</span>
              <span className="font-medium">${PRICE_NORMAL}/pax</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Enviamos a la agencia destino:
              </span>
              <span className="font-medium">${breakdown.amountToAgency.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t pt-1.5 mt-0.5">
              <span className="text-muted-foreground">
                Comisión que retenemos ({TRANSFER_COMMISSION_PER_PAX}/pax × {seatCount}):
              </span>
              <span className="font-medium">${breakdown.commissionEarned.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!isFormComplete || isPending || availableSchedules.length === 0}
          className="w-fit"
        >
          {isPending ? "Creando..." : "Crear reserva transferida"}
        </Button>
      </div>

      <QuickProveedorSheet
        open={quickProveedorOpen !== null}
        onOpenChange={(o) => { if (!o) setQuickProveedorOpen(null) }}
        proveedorTypeId={quickProveedorOpen === "destino" ? agenciaType.id : proveedorTypeId}
        proveedorTypeName={quickProveedorOpen === "destino" ? "AGENCIA" : proveedorTypeName}
        documentTypes={documentTypes}
        onCreated={(proveedor) => {
          const display = getProveedorDisplayValue(proveedor)
          const mapped: ProveedorResult = {
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
          }
          if (quickProveedorOpen === "destino") {
            setSelectedDestino(mapped)
            setDestinoDisplayValue(display)
          } else {
            setSelectedProveedor(mapped)
            setProveedorDisplayValue(display)
          }
          setQuickProveedorOpen(null)
        }}
      />

      <QuickPassengerCreateSheet
        open={quickPassengerOpen}
        onOpenChange={setQuickPassengerOpen}
        documentTypes={documentTypes}
        countries={countries}
        onCreated={(passenger) => {
          addPassenger({
            id: passenger.id,
            firstName: passenger.firstName,
            lastName: passenger.lastName,
            documentType: passenger.documentType,
            documentNumber: passenger.documentNumber,
            country: passenger.country,
            birthDate: passenger.birthDate,
          })
          setQuickPassengerOpen(false)
        }}
      />
    </div>
  )
}
