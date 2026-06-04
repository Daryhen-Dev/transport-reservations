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
  PRICE_LIBRE_MAX,
  PRICE_LIBRE_MIN,
  PRICE_NORMAL,
  type PriceType,
} from "@/lib/pricing"
import { formatDateTime } from "@/lib/format-date"
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

// Solo PERSONA en este sheet → NORMAL o LIBRE (REFERIDOS requiere proveedor
// tipo AGENCIA, que se crea en /reservas/nueva con el selector completo).
const sheetPriceTypeSchema = z.enum(["NORMAL", "LIBRE"])

const schema = z.object({
  tripId: z.string().min(1, "Debe seleccionar un viaje"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  documentTypeId: z.string().optional(),
  documentNumber: z.string().optional(),
  email: z.string().email("Email inválido"),
  countryId: z.string().optional(),
  birthDate: z.string().optional(),
  seatCount: z.number().int().min(1, "Mínimo 1 asiento"),
  passengers: z.array(clienteSchema).optional(),
  priceType: sheetPriceTypeSchema,
  priceAmount: z.number().positive("El precio debe ser mayor a 0"),
})

type FormValues = z.infer<typeof schema>

type Trip = {
  id: string
  departureAt: Date
  route: { origin: string; destination: string }
  branch: { name: string }
}

type DocumentType = { id: string; name: string }
type Country = { id: string; name: string }
type ReservationStatus = { id: string; name: string }
type ProveedorType = { id: string; name: string }

type Props = {
  trips: Trip[]
  documentTypes: DocumentType[]
  countries: Country[]
  reservationStatuses: ReservationStatus[]
  proveedorTypes: ProveedorType[]
}

export function PassengerReservationSheet({
  trips,
  documentTypes,
  countries,
  reservationStatuses,
  proveedorTypes,
}: Props) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const confirmadaStatus = reservationStatuses.find((s) => s.name === "CONFIRMADA")
  const personaType = proveedorTypes.find((t) => t.name === "PERSONA")

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
      seatCount: 1,
      passengers: [],
      priceType: "NORMAL",
      priceAmount: PRICE_NORMAL,
      email: "",
    },
  })

  const priceType = watch("priceType")

  useEffect(() => {
    if (priceType === "NORMAL") {
      setValue("priceAmount", PRICE_NORMAL)
    }
  }, [priceType, setValue])

  const { fields, append, remove } = useFieldArray({
    control,
    name: "passengers",
  })

  useEffect(() => {
    if (!open) {
      reset({
        seatCount: 1,
        passengers: [],
        priceType: "NORMAL",
        priceAmount: PRICE_NORMAL,
        email: "",
      })
    }
  }, [open, reset])

  async function onSubmit(data: FormValues) {
    const proveedorTypeId = personaType?.id ?? ""
    if (!proveedorTypeId) {
      toast.error("Falta el tipo de proveedor PERSONA en el sistema")
      return
    }

    if (!data.firstName || !data.lastName || !data.documentTypeId || !data.documentNumber || !data.countryId || !data.email) {
      toast.error("Complete todos los campos del comprador")
      return
    }

    const proveedor: CreatePassengerReservationInput["proveedor"] = {
      customerType: "PERSONA",
      firstName: data.firstName,
      lastName: data.lastName,
      documentTypeId: data.documentTypeId,
      documentNumber: data.documentNumber,
      email: data.email,
      countryId: data.countryId,
      birthDate: data.birthDate,
    }

    if (data.priceType === "LIBRE") {
      if (data.priceAmount < PRICE_LIBRE_MIN || data.priceAmount > PRICE_LIBRE_MAX) {
        toast.error(`El precio LIBRE debe estar entre $${PRICE_LIBRE_MIN} y $${PRICE_LIBRE_MAX}`)
        return
      }
    }

    try {
      await api.reservations.passengers.create({
        tripId: data.tripId,
        seatCount: data.seatCount,
        proveedor,
        passengers: data.passengers ?? [],
        proveedorTypeId,
        reservationStatusId: confirmadaStatus?.id,
        priceType: data.priceType as PriceType,
        priceAmount: data.priceType === "LIBRE" ? data.priceAmount : undefined,
      })
      toast.success("Reserva creada exitosamente")
      reset({
        seatCount: 1,
        passengers: [],
        priceType: "NORMAL",
        priceAmount: PRICE_NORMAL,
        email: "",
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tripId">Viaje</Label>
            <Select onValueChange={(val) => setValue("tripId", val)}>
              <SelectTrigger id="tripId" className="w-full">
                <SelectValue placeholder="Seleccionar viaje" />
              </SelectTrigger>
              <SelectContent>
                {trips.map((trip) => (
                  <SelectItem key={trip.id} value={trip.id}>
                    {formatDateTime(trip.departureAt)} — {trip.route.origin} → {trip.route.destination} ({trip.branch.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.tripId && (
              <p className="text-sm text-destructive">{errors.tripId.message}</p>
            )}
          </div>

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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="comprador@ejemplo.com" {...register("email")} />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

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

          {/* Tipo de precio */}
          <div className="flex flex-col gap-1.5 border-t pt-4">
            <Label htmlFor="priceType">Tipo de precio</Label>
            <Select
              value={priceType}
              onValueChange={(val) => setValue("priceType", val as "NORMAL" | "LIBRE")}
            >
              <SelectTrigger id="priceType" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NORMAL">Normal — ${PRICE_NORMAL} fijo</SelectItem>
                <SelectItem value="LIBRE">Libre — ${PRICE_LIBRE_MIN} a ${PRICE_LIBRE_MAX}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="priceAmount">Precio cobrado (USD)</Label>
            <Input
              id="priceAmount"
              type="number"
              step="0.01"
              min={priceType === "LIBRE" ? PRICE_LIBRE_MIN : undefined}
              max={priceType === "LIBRE" ? PRICE_LIBRE_MAX : undefined}
              disabled={priceType === "NORMAL"}
              {...register("priceAmount", { valueAsNumber: true })}
            />
            {priceType === "LIBRE" && (
              <p className="text-xs text-muted-foreground">
                Rango permitido: ${PRICE_LIBRE_MIN} a ${PRICE_LIBRE_MAX}.
              </p>
            )}
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
