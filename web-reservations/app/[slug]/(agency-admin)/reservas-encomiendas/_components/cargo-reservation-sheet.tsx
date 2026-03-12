"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconPlus } from "@tabler/icons-react"
import { createCargoReservation } from "@/app/actions/cargo-reservation"
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
  // Cargo
  weightKg: z.number().positive("El peso debe ser mayor a 0"),
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
  currentSlug: string
  trips: Trip[]
  documentTypes: DocumentType[]
  countries: Country[]
  reservationStatuses: ReservationStatus[]
  proveedorTypes: ProveedorType[]
}

export function CargoReservationSheet({
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
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      proveedorType: "PERSONA",
      weightKg: undefined,
    },
  })

  const proveedorType = watch("proveedorType")

  useEffect(() => {
    if (!open) {
      reset({
        proveedorType: "PERSONA",
        weightKg: undefined,
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

    const result = await createCargoReservation({
      tripId: data.tripId,
      weightKg: data.weightKg,
      diameterCm: isNaN(data.diameterCm as number) ? undefined : data.diameterCm,
      widthCm: isNaN(data.widthCm as number) ? undefined : data.widthCm,
      heightCm: isNaN(data.heightCm as number) ? undefined : data.heightCm,
      lengthCm: isNaN(data.lengthCm as number) ? undefined : data.lengthCm,
      proveedor,
      currentSlug,
      proveedorTypeId,
      reservationStatusId: pendienteStatus?.id ?? "",
    })

    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success("Encomienda registrada exitosamente")
    reset({ proveedorType: "PERSONA", weightKg: undefined })
    setOpen(false)
    router.refresh()
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">
          <IconPlus className="size-4" />
          Nueva encomienda
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Nueva reserva de encomienda</SheetTitle>
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

          {/* Cargo details */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">Detalles de la encomienda</p>
            <div className="flex flex-col gap-3">
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
              <p className="text-xs text-muted-foreground">
                Para objetos cilíndricos use diámetro. Para cajas use ancho/alto/largo.
              </p>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="diameterCm">Diámetro (cm) — opcional</Label>
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

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Registrando..." : "Registrar encomienda"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
