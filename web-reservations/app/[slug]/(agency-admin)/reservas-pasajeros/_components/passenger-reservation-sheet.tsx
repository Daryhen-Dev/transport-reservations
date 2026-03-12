"use client"

import { useEffect, useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconPlus, IconTrash } from "@tabler/icons-react"
import { createPassengerReservation } from "@/app/actions/passenger-reservation"
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
  currentSlug: string
  trips: Trip[]
  documentTypes: DocumentType[]
  countries: Country[]
  reservationStatuses: ReservationStatus[]
  proveedorTypes: ProveedorType[]
}

export function PassengerReservationSheet({
  currentSlug,
  trips,
  documentTypes,
  countries,
  reservationStatuses,
  proveedorTypes,
}: Props) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const pendienteStatus = reservationStatuses.find((s) => s.name === "PENDIENTE")
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
    },
  })

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
      })
    }
  }, [open, reset])

  async function onSubmit(data: FormValues) {
    const proveedorTypeId = data.proveedorType === "PERSONA"
      ? personaType?.id ?? ""
      : empresaType?.id ?? ""

    let proveedor: Record<string, unknown>
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

    const result = await createPassengerReservation({
      tripId: data.tripId,
      seatCount: data.seatCount,
      proveedor,
      passengers: data.passengers ?? [],
      currentSlug,
      proveedorTypeId,
      reservationStatusId: pendienteStatus?.id ?? "",
    })

    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success("Reserva creada exitosamente")
    reset({ proveedorType: "PERSONA", seatCount: 1, passengers: [] })
    setOpen(false)
    router.refresh()
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">
          <IconPlus className="size-4" />
          Nueva reserva
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
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
              <div className="flex flex-col gap-1.5">
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
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="documentNumber">Número de documento</Label>
                <Input id="documentNumber" placeholder="V-12345678" {...register("documentNumber")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="countryId">País</Label>
                <Select onValueChange={(val) => setValue("countryId", val)}>
                  <SelectTrigger id="countryId" className="w-full">
                    <SelectValue placeholder="Seleccionar país" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="birthDate">Fecha de nacimiento (opcional)</Label>
                <Input id="birthDate" type="date" {...register("birthDate")} />
              </div>
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
            </>
          )}

          {/* Seat count */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="seatCount">Cantidad de asientos</Label>
            <Input
              id="seatCount"
              type="number"
              min={1}
              {...register("seatCount", { valueAsNumber: true })}
            />
            {errors.seatCount && (
              <p className="text-sm text-destructive">{errors.seatCount.message}</p>
            )}
          </div>

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

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creando..." : "Crear reserva"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
