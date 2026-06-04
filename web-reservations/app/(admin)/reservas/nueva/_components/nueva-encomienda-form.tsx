"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { parseISO, startOfDay, isToday, isBefore } from "date-fns"
import { formatDateWithWeekday } from "@/lib/format-date"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
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
import type { TripScheduleWithRoute } from "./nueva-reserva-form"

type ProveedorResult = {
  id: string
  firstName: string | null
  lastName: string | null
  companyName: string | null
  documentNumber: string | null
  proveedorType: { id: string; name: string } | null
  documentType: { id: string; name: string } | null
}

const cargoSchema = z.object({
  categoriaId: z.string().min(1, "Debe seleccionar una categoría"),
  destFirstName: z.string().min(1, "El nombre del destinatario es requerido"),
  destLastName: z.string().min(1, "El apellido del destinatario es requerido"),
  destPhone: z.string().optional(),
  destDocumentTypeId: z.string().optional(),
  destDocumentNumber: z.string().optional(),
  description: z.string().optional(),
  weightKg: z.number().positive("El peso debe ser mayor a 0"),
  priceAmount: z.number().positive("El precio debe ser mayor a 0"),
  cobrarEnDestino: z.boolean().optional(),
  destinoType: z.enum(["SUCURSAL", "EXTERNO"]),
  destinationBranchId: z.string().optional(),
  externalDestination: z.string().optional(),
})

type FormValues = z.infer<typeof cargoSchema>

type Props = {
  fecha: string | null
  slug?: string
  branchId: string
  schedules: TripScheduleWithRoute[]
  documentTypes: { id: string; name: string }[]
  proveedorTypes: { id: string; name: string }[]
  categorias: { id: string; name: string }[]
  branches: { id: string; name: string }[]
}

function formatScheduleLabel(s: TripScheduleWithRoute) {
  return `${s.time} — ${s.route.origin} → ${s.route.destination}`
}

function capitalizeFirst(str: string) {
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

export function NuevaEncomiendaForm({
  fecha,
  slug,
  branchId,
  schedules,
  documentTypes,
  proveedorTypes,
  categorias,
  branches,
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

  const defaultPersonaType = proveedorTypes.find((pt) =>
    pt.name.toLowerCase().includes("persona")
  )

  const [scheduleId, setScheduleId] = useState("")
  const [proveedorTypeId, setProveedorTypeId] = useState<string | null>(defaultPersonaType?.id ?? null)
  const [proveedorTypeName, setProveedorTypeName] = useState<string | null>(defaultPersonaType?.name ?? null)
  const [selectedProveedor, setSelectedProveedor] = useState<ProveedorResult | null>(null)
  const [proveedorDisplayValue, setProveedorDisplayValue] = useState("")
  const [quickSheetOpen, setQuickSheetOpen] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(cargoSchema),
    defaultValues: { destinoType: "SUCURSAL", weightKg: undefined },
  })

  const destinoType = watch("destinoType")

  function handleProveedorTypeChange(value: string) {
    const found = proveedorTypes.find((pt) => pt.id === value)
    setProveedorTypeId(value)
    setProveedorTypeName(found?.name ?? null)
    setSelectedProveedor(null)
    setProveedorDisplayValue("")
  }

  function onSubmit(data: FormValues) {
    if (!fecha || !scheduleId || !selectedProveedor) {
      toast.error("Complete todos los campos requeridos")
      return
    }

    startTransition(async () => {
      try {
        await api.reservations.cargo.createQuick({
          scheduleId,
          date: fecha,
          branchId,
          proveedorId: selectedProveedor.id,
          categoriaId: data.categoriaId,
          destinatario: {
            firstName: data.destFirstName,
            lastName: data.destLastName,
            phone: data.destPhone,
            documentTypeId: data.destDocumentTypeId,
            documentNumber: data.destDocumentNumber,
          },
          description: data.description,
          weightKg: data.weightKg,
          priceAmount: data.priceAmount,
          cobrarEnDestino: data.cobrarEnDestino ?? false,
          destinationBranchId: data.destinoType === "SUCURSAL" ? data.destinationBranchId : undefined,
          externalDestination: data.destinoType === "EXTERNO" ? data.externalDestination : undefined,
        })

        toast.success("Encomienda creada exitosamente")
        router.push(`/reservas`)
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Error al crear la encomienda"
        toast.error(message)
      }
    })
  }

  return (
    <div className="px-4 lg:px-6">
      <div className="max-w-lg flex flex-col gap-5">
        {/* Fecha */}
        <div className="flex flex-col gap-1.5">
          <Label>Fecha</Label>
          <p className="text-sm font-medium">
            {fecha
              ? capitalizeFirst(formatDateWithWeekday(fecha))
              : "Sin fecha seleccionada"}
          </p>
          {isFechaInPast && (
            <p className="text-sm text-destructive">
              No se pueden crear reservas para fechas pasadas.
            </p>
          )}
        </div>

        {/* Horario */}
        <div className="flex flex-col gap-1.5">
          <Label>Horario</Label>
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
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar horario" />
              </SelectTrigger>
              <SelectContent>
                {availableSchedules.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {formatScheduleLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Tipo de proveedor */}
        <div className="flex flex-col gap-1.5">
          <Label>Tipo de Proveedor</Label>
          <Select onValueChange={handleProveedorTypeChange} value={proveedorTypeId ?? ""}>
            <SelectTrigger className="w-full">
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
          <Label>Proveedor (remitente)</Label>
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

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          {/* Destinatario */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">Destinatario</p>
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <div className="flex flex-col gap-1.5 flex-1">
                  <Label htmlFor="destFirstName">Nombre *</Label>
                  <Input id="destFirstName" placeholder="María" {...register("destFirstName")} />
                  {errors.destFirstName && (
                    <p className="text-sm text-destructive">{errors.destFirstName.message}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <Label htmlFor="destLastName">Apellido *</Label>
                  <Input id="destLastName" placeholder="López" {...register("destLastName")} />
                  {errors.destLastName && (
                    <p className="text-sm text-destructive">{errors.destLastName.message}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="destPhone">Teléfono (opcional)</Label>
                <Input id="destPhone" placeholder="+58 412 123 4567" {...register("destPhone")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="destDocumentTypeId">Tipo de documento (opcional)</Label>
                <Select onValueChange={(val) => setValue("destDocumentTypeId", val)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes.map((dt) => (
                      <SelectItem key={dt.id} value={dt.id}>{dt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="destDocumentNumber">Número de documento (opcional)</Label>
                <Input id="destDocumentNumber" placeholder="V-98765432" {...register("destDocumentNumber")} />
              </div>
            </div>
          </div>

          {/* Detalles */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">Detalles de la encomienda</p>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Categoría *</Label>
                <Select onValueChange={(val) => setValue("categoriaId", val, { shouldValidate: true })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.categoriaId && (
                  <p className="text-xs text-destructive">{errors.categoriaId.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="description">Descripción (opcional)</Label>
                <Textarea
                  id="description"
                  placeholder="Descripción del contenido..."
                  rows={2}
                  {...register("description")}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="weightKg">Peso (kg) *</Label>
                <Input
                  id="weightKg"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="10.5"
                  className="w-32"
                  {...register("weightKg", { valueAsNumber: true })}
                />
                {errors.weightKg && (
                  <p className="text-sm text-destructive">{errors.weightKg.message}</p>
                )}
              </div>

              {/* Destino */}
              <div className="flex flex-col gap-1.5">
                <Label>Tipo de destino</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={destinoType === "SUCURSAL" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setValue("destinoType", "SUCURSAL")}
                  >
                    Sucursal
                  </Button>
                  <Button
                    type="button"
                    variant={destinoType === "EXTERNO" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setValue("destinoType", "EXTERNO")}
                  >
                    Externo
                  </Button>
                </div>
              </div>

              {destinoType === "SUCURSAL" ? (
                <div className="flex flex-col gap-1.5">
                  <Label>Sucursal de destino</Label>
                  <Select onValueChange={(val) => setValue("destinationBranchId", val)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar sucursal" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="externalDestination">Destino externo</Label>
                  <Input
                    id="externalDestination"
                    placeholder="Dirección o descripción del destino"
                    {...register("externalDestination")}
                  />
                </div>
              )}

              {/* Precio */}
              <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="priceAmount">Precio de la encomienda *</Label>
                  <Input
                    id="priceAmount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    className="w-40"
                    {...register("priceAmount", { valueAsNumber: true })}
                  />
                  {errors.priceAmount && (
                    <p className="text-xs text-destructive">{errors.priceAmount.message}</p>
                  )}
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    className="size-4"
                    {...register("cobrarEnDestino")}
                  />
                  <span>Cobrar en sucursal de destino (encomienda por cobrar)</span>
                </label>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isPending || isFechaInPast || !scheduleId || !selectedProveedor || availableSchedules.length === 0}
            className="w-fit"
          >
            {isPending ? "Creando..." : "Crear Encomienda"}
          </Button>
        </form>
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
