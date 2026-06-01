"use client"

import { useEffect, useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconPlus, IconTrash } from "@tabler/icons-react"
import { api, ApiError } from "@/lib/api/client"
import type { CreatePassengerReservationInput } from "@/lib/api/schemas/passenger-reservations"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
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

const clienteSchema = z.object({
  firstName: z.string().min(1, "Requerido"),
  lastName: z.string().min(1, "Requerido"),
  documentTypeId: z.string().min(1, "Requerido"),
  documentNumber: z.string().min(1, "Requerido"),
  countryId: z.string().min(1, "Requerido"),
  birthDate: z.string().optional(),
})

const schema = z.object({
  tripId: z.string().min(1, "Debe seleccionar un viaje"),
  proveedorType: z.enum(["PERSONA", "EMPRESA"]),
  // PERSONA
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  documentTypeId: z.string().optional(),
  documentNumber: z.string().optional(),
  countryId: z.string().optional(),
  birthDate: z.string().optional(),
  // EMPRESA
  companyName: z.string().optional(),
  taxId: z.string().optional(),
  contactName: z.string().optional(),
  // Reservation
  seatCount: z.number().int().min(1, "Mínimo 1 asiento"),
  passengers: z.array(clienteSchema).optional(),
  // Channel + pricing
  salesChannel: z.enum(["DIRECT", "FROM_AGENCY", "TO_AGENCY"]),
  externalAgencyId: z.string().optional(),
  priceAmount: z.number().positive("El precio debe ser mayor a 0"),
})

type FormValues = z.infer<typeof schema>

type Trip = {
  id: string
  departureAt: Date
  route: {
    origin: string
    destination: string
    directPriceAmount?: unknown
    incomingAgencyPriceAmount?: unknown
    outgoingCommissionAmount?: unknown
    minPrice?: unknown
  }
  branch: { name: string }
}

type DocumentType = { id: string; name: string }
type Country = { id: string; name: string }
type ReservationStatus = { id: string; name: string }
type ProveedorType = { id: string; name: string }
type Agency = {
  id: string
  firstName: string | null
  lastName: string | null
  companyName: string | null
}

type Props = {
  trips: Trip[]
  documentTypes: DocumentType[]
  countries: Country[]
  reservationStatuses: ReservationStatus[]
  proveedorTypes: ProveedorType[]
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

export function PassengerReservationSheet({
  trips,
  documentTypes,
  countries,
  reservationStatuses,
  proveedorTypes,
  agencies,
}: Props) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const confirmadaStatus = reservationStatuses.find((s) => s.name === "CONFIRMADA")
  const personaType = proveedorTypes.find((t) => t.name === "PERSONA")
  const empresaType = proveedorTypes.find((t) => t.name === "EMPRESA")

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      proveedorType: "PERSONA",
      seatCount: 1,
      passengers: [],
      salesChannel: "DIRECT",
      externalAgencyId: "",
      priceAmount: 0,
    },
  })

  const tripIdValue = watch("tripId")
  const salesChannelValue = watch("salesChannel")
  const selectedTrip = trips.find((t) => t.id === tripIdValue)
  const directPrice = asNumber(selectedTrip?.route.directPriceAmount)
  const incomingPrice = asNumber(selectedTrip?.route.incomingAgencyPriceAmount)
  const minPrice = asNumber(selectedTrip?.route.minPrice)
  const suggested =
    salesChannelValue === "FROM_AGENCY" ? incomingPrice : directPrice

  useEffect(() => {
    if (suggested !== null) {
      setValue("priceAmount", suggested)
    }
  }, [suggested, setValue])

  const { fields, append, remove } = useFieldArray({
    control,
    name: "passengers",
  })

  const proveedorType = watch("proveedorType")

  useEffect(() => {
    if (!open) {
      reset({
        proveedorType: "PERSONA",
        seatCount: 1,
        passengers: [],
        salesChannel: "DIRECT",
        externalAgencyId: "",
        priceAmount: 0,
      })
    }
  }, [open, reset])

  async function onSubmit(data: FormValues) {
    const proveedorTypeId = data.proveedorType === "PERSONA"
      ? personaType?.id ?? ""
      : empresaType?.id ?? ""

    let proveedor: CreatePassengerReservationInput["proveedor"]
    if (data.proveedorType === "PERSONA") {
      if (!data.firstName || !data.lastName || !data.documentTypeId || !data.documentNumber || !data.countryId) {
        toast.error("Complete todos los campos del proveedor")
        return
      }
      proveedor = {
        customerType: "PERSONA",
        firstName: data.firstName,
        lastName: data.lastName,
        documentTypeId: data.documentTypeId,
        documentNumber: data.documentNumber,
        countryId: data.countryId,
        birthDate: data.birthDate,
      }
    } else {
      if (!data.companyName || !data.taxId) {
        toast.error("Complete los campos de la empresa")
        return
      }
      proveedor = {
        customerType: "EMPRESA",
        companyName: data.companyName,
        taxId: data.taxId,
        contactName: data.contactName,
      }
    }

    if (data.salesChannel !== "DIRECT" && !data.externalAgencyId) {
      toast.error("Seleccione la agencia externa para este canal")
      return
    }
    if (minPrice !== null && data.priceAmount < minPrice) {
      toast.error(`El precio no puede ser menor al mínimo ($${minPrice.toFixed(2)})`)
      return
    }

    try {
      await api.reservations.passengers.create({
        tripId: data.tripId,
        seatCount: data.seatCount,
        proveedor,
        passengers: data.passengers ?? [],
        proveedorTypeId,
        reservationStatusId: confirmadaStatus?.id,
        priceAmount: data.priceAmount,
        salesChannel: data.salesChannel,
        externalAgencyId:
          data.salesChannel === "DIRECT"
            ? null
            : data.externalAgencyId || null,
      })
      toast.success("Reserva creada exitosamente")
      reset({
        proveedorType: "PERSONA",
        seatCount: 1,
        passengers: [],
        salesChannel: "DIRECT",
        externalAgencyId: "",
        priceAmount: 0,
      })
      setOpen(false)
      router.refresh()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Error al crear la reserva"
      toast.error(message)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">
          <IconPlus className="size-4" />
          Nueva reserva
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nueva reserva de pasajeros</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 px-4 pb-8">
          {/* Trip selection */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tripId">Viaje</Label>
            <Select onValueChange={(val) => setValue("tripId", val)}>
              <SelectTrigger id="tripId" className="w-full">
                <SelectValue placeholder="Seleccionar viaje" />
              </SelectTrigger>
              <SelectContent>
                {trips.map((trip) => (
                  <SelectItem key={trip.id} value={trip.id}>
                    {new Date(trip.departureAt).toLocaleString("es-AR", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    — {trip.route.origin} → {trip.route.destination} ({trip.branch.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.tripId && (
              <p className="text-sm text-destructive">{errors.tripId.message}</p>
            )}
          </div>

          {/* Proveedor type */}
          <div className="flex flex-col gap-1.5">
            <Label>Tipo de proveedor</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={proveedorType === "PERSONA" ? "default" : "outline"}
                size="sm"
                onClick={() => setValue("proveedorType", "PERSONA")}
              >
                Persona
              </Button>
              <Button
                type="button"
                variant={proveedorType === "EMPRESA" ? "default" : "outline"}
                size="sm"
                onClick={() => setValue("proveedorType", "EMPRESA")}
              >
                Empresa
              </Button>
            </div>
          </div>

          {proveedorType === "PERSONA" ? (
            <>
              <div className="flex gap-2">
                <div className="flex flex-col gap-1.5 flex-1">
                  <Label htmlFor="firstName">Nombre</Label>
                  <Input id="firstName" placeholder="Juan" {...register("firstName")} />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <Label htmlFor="lastName">Apellido</Label>
                  <Input id="lastName" placeholder="Pérez" {...register("lastName")} />
                </div>
              </div>

              {/* Tipo de documento + Número de documento */}
              <div className="flex gap-2">
                <div className="flex flex-col gap-1.5 flex-1">
                  <Label htmlFor="documentTypeId">Tipo de documento</Label>
                  <Select onValueChange={(val) => setValue("documentTypeId", val)}>
                    <SelectTrigger id="documentTypeId" className="w-full">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {documentTypes.map((dt) => (
                        <SelectItem key={dt.id} value={dt.id}>{dt.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <Label htmlFor="documentNumber">Número de documento</Label>
                  <Input id="documentNumber" placeholder="V-12345678" {...register("documentNumber")} />
                </div>
              </div>

              {/* País + Fecha de nacimiento + Cantidad */}
              <div className="flex gap-2">
                <div className="flex flex-col gap-1.5 flex-1">
                  <Label htmlFor="countryId">País</Label>
                  <Select onValueChange={(val) => setValue("countryId", val)}>
                    <SelectTrigger id="countryId" className="w-full">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <Label htmlFor="birthDate">Nacimiento</Label>
                  <Input id="birthDate" type="date" {...register("birthDate")} />
                </div>
                <div className="flex flex-col gap-1.5 w-24">
                  <Label htmlFor="seatCount">Asientos</Label>
                  <Input
                    id="seatCount"
                    type="number"
                    min={1}
                    {...register("seatCount", { valueAsNumber: true })}
                  />
                </div>
              </div>
              {errors.seatCount && (
                <p className="text-sm text-destructive">{errors.seatCount.message}</p>
              )}
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="companyName">Nombre de la empresa</Label>
                <Input id="companyName" placeholder="Empresa S.A." {...register("companyName")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="taxId">RIF/NIT</Label>
                <Input id="taxId" placeholder="J-12345678-0" {...register("taxId")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contactName">Persona de contacto (opcional)</Label>
                <Input id="contactName" placeholder="Juan Pérez" {...register("contactName")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="seatCount">Cantidad de asientos</Label>
                <Input
                  id="seatCount"
                  type="number"
                  min={1}
                  className="w-32"
                  {...register("seatCount", { valueAsNumber: true })}
                />
                {errors.seatCount && (
                  <p className="text-sm text-destructive">{errors.seatCount.message}</p>
                )}
              </div>
            </>
          )}

          {/* Passengers */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Pasajeros</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    firstName: "",
                    lastName: "",
                    documentTypeId: "",
                    documentNumber: "",
                    countryId: "",
                    birthDate: "",
                  })
                }
              >
                <IconPlus className="size-3" />
                Agregar cliente
              </Button>
            </div>
            {fields.map((field, index) => (
              <div key={field.id} className="border rounded-md p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Pasajero {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive hover:text-destructive"
                    onClick={() => remove(index)}
                  >
                    <IconTrash className="size-3" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <div className="flex flex-col gap-1 flex-1">
                    <Label className="text-xs">Nombre</Label>
                    <Input
                      placeholder="Nombre"
                      {...register(`passengers.${index}.firstName`)}
                    />
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <Label className="text-xs">Apellido</Label>
                    <Input
                      placeholder="Apellido"
                      {...register(`passengers.${index}.lastName`)}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Tipo de documento</Label>
                  <Select onValueChange={(val) => setValue(`passengers.${index}.documentTypeId`, val)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {documentTypes.map((dt) => (
                        <SelectItem key={dt.id} value={dt.id}>{dt.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Número de documento</Label>
                  <Input
                    placeholder="V-12345678"
                    {...register(`passengers.${index}.documentNumber`)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">País</Label>
                  <Select onValueChange={(val) => setValue(`passengers.${index}.countryId`, val)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="País" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Fecha de nacimiento (opcional)</Label>
                  <Input type="date" {...register(`passengers.${index}.birthDate`)} />
                </div>
              </div>
            ))}
          </div>

          {/* Canal de venta */}
          <div className="flex flex-col gap-1.5 border-t pt-4">
            <Label htmlFor="salesChannel">Canal de venta</Label>
            <Select
              value={salesChannelValue}
              onValueChange={(val) =>
                setValue("salesChannel", val as FormValues["salesChannel"])
              }
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

          {salesChannelValue !== "DIRECT" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="externalAgencyId">Agencia externa</Label>
              <Select
                value={watch("externalAgencyId") ?? ""}
                onValueChange={(val) => setValue("externalAgencyId", val)}
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="priceAmount">Precio cobrado (USD)</Label>
            <Input
              id="priceAmount"
              type="number"
              step="0.01"
              min={0}
              {...register("priceAmount", { valueAsNumber: true })}
            />
            <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
              {suggested !== null && (
                <span>Precio sugerido: ${suggested.toFixed(2)}</span>
              )}
              {minPrice !== null && (
                <span>Precio mínimo permitido: ${minPrice.toFixed(2)}</span>
              )}
            </div>
            {errors.priceAmount && (
              <p className="text-sm text-destructive">
                {errors.priceAmount.message}
              </p>
            )}
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creando..." : "Crear reserva"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
