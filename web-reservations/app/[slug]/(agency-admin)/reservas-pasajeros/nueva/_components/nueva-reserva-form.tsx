"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { parseISO, format } from "date-fns"
import { es } from "date-fns/locale"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Autocomplete } from "@/components/ui/autocomplete"
import { createQuickPassengerReservation } from "@/app/actions/passenger-reservation"
import { searchProveedoresAction } from "@/app/actions/search"
import { QuickProveedorSheet } from "./quick-proveedor-sheet"
import type { ProveedorWithRelations } from "@/app/actions/proveedor"

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

type Props = {
  fecha: string | null
  schedules: TripScheduleWithRoute[]
  proveedorTypes: ProveedorType[]
  documentTypes: DocumentType[]
  slug: string
  branchId: string
}

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

export function NuevaReservaForm({ fecha, schedules, proveedorTypes, documentTypes, slug, branchId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const defaultPersonaType = proveedorTypes.find((pt) =>
    pt.name.toLowerCase().includes("persona")
  )

  const [scheduleId, setScheduleId] = useState<string>("")
  const [proveedorTypeId, setProveedorTypeId] = useState<string | null>(defaultPersonaType?.id ?? null)
  const [proveedorTypeName, setProveedorTypeName] = useState<string | null>(defaultPersonaType?.name ?? null)
  const [selectedProveedor, setSelectedProveedor] = useState<ProveedorResult | null>(null)
  const [proveedorDisplayValue, setProveedorDisplayValue] = useState<string>("")
  const [seatCount, setSeatCount] = useState<number>(1)
  const [quickSheetOpen, setQuickSheetOpen] = useState(false)

  const isFormComplete =
    scheduleId !== "" &&
    proveedorTypeId !== null &&
    selectedProveedor !== null &&
    seatCount >= 1

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
      const result = await createQuickPassengerReservation({
        scheduleId,
        date: fecha,
        proveedorId: selectedProveedor.id,
        seatCount,
        branchId,
        currentSlug: slug,
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success("Reserva creada exitosamente")
      router.push(`/${slug}/reservas-pasajeros`)
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
        </div>

        {/* Horario */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="scheduleId">Horario</Label>
          {schedules.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay horarios configurados para esta sucursal
            </p>
          ) : (
            <Select onValueChange={setScheduleId} value={scheduleId}>
              <SelectTrigger id="scheduleId" className="w-full">
                <SelectValue placeholder="Seleccionar horario" />
              </SelectTrigger>
              <SelectContent>
                {schedules.map((schedule) => (
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
              searchProveedoresAction(query, proveedorTypeId ?? undefined) as Promise<ProveedorResult[]>
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

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={!isFormComplete || isPending || schedules.length === 0}
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
        currentSlug={slug}
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
