"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconPlus } from "@tabler/icons-react"
import { api, ApiError } from "@/lib/api/client"
import type { CreateCargoReservationInput } from "@/lib/api/schemas/cargo-reservations"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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
  // Categoría
  categoriaId: z.string().optional(),
  // Destinatario
  destFirstName: z.string().min(1, "El nombre del destinatario es requerido"),
  destLastName: z.string().min(1, "El apellido del destinatario es requerido"),
  destPhone: z.string().optional(),
  destDocumentTypeId: z.string().optional(),
  destDocumentNumber: z.string().optional(),
  // Descripción
  description: z.string().optional(),
  // Peso
  weightKg: z.number().positive("El peso debe ser mayor a 0"),
  // Destino
  destinoType: z.enum(["SUCURSAL", "EXTERNO"]),
  destinationBranchId: z.string().optional(),
  externalDestination: z.string().optional(),
  // Dimensiones opcionales
  diameterCm: z.union([z.number().positive(), z.nan()]).optional(),
  widthCm: z.union([z.number().positive(), z.nan()]).optional(),
  heightCm: z.union([z.number().positive(), z.nan()]).optional(),
  lengthCm: z.union([z.number().positive(), z.nan()]).optional(),
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
  categorias: { id: string; name: string }[]
  branches: { id: string; name: string }[]
}

export function CargoReservationSheet({
  trips,
  documentTypes,
  countries,
  reservationStatuses,
  proveedorTypes,
  categorias,
  branches,
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
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      proveedorType: "PERSONA",
      destinoType: "SUCURSAL",
      weightKg: undefined,
    },
  })

  const proveedorType = watch("proveedorType")
  const destinoType = watch("destinoType")

  useEffect(() => {
    if (!open) {
      reset({
        proveedorType: "PERSONA",
        destinoType: "SUCURSAL",
        weightKg: undefined,
      })
    }
  }, [open, reset])

  async function onSubmit(data: FormValues) {
    const proveedorTypeId = data.proveedorType === "PERSONA"
      ? personaType?.id ?? ""
      : empresaType?.id ?? ""

    let proveedor: CreateCargoReservationInput["proveedor"]
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

    try {
      await api.reservations.cargo.create({
        tripId: data.tripId,
        weightKg: data.weightKg,
        diameterCm: isNaN(data.diameterCm as number) ? undefined : data.diameterCm,
        widthCm: isNaN(data.widthCm as number) ? undefined : data.widthCm,
        heightCm: isNaN(data.heightCm as number) ? undefined : data.heightCm,
        lengthCm: isNaN(data.lengthCm as number) ? undefined : data.lengthCm,
        categoriaId: data.categoriaId,
        description: data.description,
        destinationBranchId: data.destinoType === "SUCURSAL" ? data.destinationBranchId : undefined,
        externalDestination: data.destinoType === "EXTERNO" ? data.externalDestination : undefined,
        destinatario: {
          firstName: data.destFirstName,
          lastName: data.destLastName,
          phone: data.destPhone,
          documentTypeId: data.destDocumentTypeId,
          documentNumber: data.destDocumentNumber,
        },
        proveedor,
        proveedorTypeId,
        reservationStatusId: confirmadaStatus?.id ?? "",
      })
      toast.success("Encomienda registrada exitosamente")
      reset({ proveedorType: "PERSONA", destinoType: "SUCURSAL", weightKg: undefined })
      setOpen(false)
      router.refresh()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Error al crear la reserva de encomienda"
      toast.error(message)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">
          <IconPlus className="size-4" />
          Nueva encomienda
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto w-full! sm:max-w-xl! md:max-w-2xl! lg:max-w-[45vw]!">
        <SheetHeader>
          <SheetTitle>Nueva reserva de encomienda</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 px-4 pb-8">

          {/* Viaje */}
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

          {/* Proveedor */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">Proveedor (remitente)</p>
            <div className="flex flex-col gap-3">
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
            </div>
          </div>

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
                  <SelectTrigger id="destDocumentTypeId" className="w-full">
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

          {/* Detalles de la encomienda */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">Detalles de la encomienda</p>
            <div className="flex flex-col gap-3">
              {/* Categoría */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="categoriaId">Categoría (opcional)</Label>
                <Select onValueChange={(val) => setValue("categoriaId", val)}>
                  <SelectTrigger id="categoriaId" className="w-full">
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Descripción */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="description">Descripción (opcional)</Label>
                <Textarea
                  id="description"
                  placeholder="Descripción del contenido..."
                  rows={2}
                  {...register("description")}
                />
              </div>

              {/* Peso */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="weightKg">Peso (kg) *</Label>
                <Input
                  id="weightKg"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="10.5"
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
                  <Label htmlFor="destinationBranchId">Sucursal de destino</Label>
                  <Select onValueChange={(val) => setValue("destinationBranchId", val)}>
                    <SelectTrigger id="destinationBranchId" className="w-full">
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

              {/* Dimensiones */}
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">
                  Dimensiones opcionales. Para objetos cilíndricos use diámetro. Para cajas use ancho/alto/largo.
                </p>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="diameterCm">Diámetro (cm)</Label>
                  <Input
                    id="diameterCm"
                    type="number"
                    step="0.1"
                    placeholder="30"
                    {...register("diameterCm", { valueAsNumber: true })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="widthCm">Ancho (cm)</Label>
                    <Input
                      id="widthCm"
                      type="number"
                      step="0.1"
                      placeholder="20"
                      {...register("widthCm", { valueAsNumber: true })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="heightCm">Alto (cm)</Label>
                    <Input
                      id="heightCm"
                      type="number"
                      step="0.1"
                      placeholder="30"
                      {...register("heightCm", { valueAsNumber: true })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="lengthCm">Largo (cm)</Label>
                    <Input
                      id="lengthCm"
                      type="number"
                      step="0.1"
                      placeholder="50"
                      {...register("lengthCm", { valueAsNumber: true })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Registrando..." : "Registrar encomienda"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
