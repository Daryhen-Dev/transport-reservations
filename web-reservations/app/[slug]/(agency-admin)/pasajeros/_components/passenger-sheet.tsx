"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { format } from "date-fns"
import { createPassenger, updatePassenger } from "@/app/actions/passenger"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
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
  firstName: z.string().min(1, "El nombre es requerido"),
  lastName: z.string().min(1, "El apellido es requerido"),
  documentTypeId: z.string().min(1, "El tipo de documento es requerido"),
  documentNumber: z.string().min(1, "El número de documento es requerido"),
  countryId: z.string().min(1, "El país es requerido"),
  birthDate: z.string().optional(),
  phone: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

type Passenger = {
  id: string
  firstName: string
  lastName: string
  documentType: { id: string; name: string }
  documentNumber: string
  country: { id: string; name: string }
  birthDate: Date | null
  phone: string | null
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  passenger: Passenger | null
  documentTypes: Array<{ id: string; name: string }>
  countries: Array<{ id: string; name: string }>
  currentSlug: string
}

export function PassengerSheet({
  open,
  onOpenChange,
  passenger,
  documentTypes,
  countries,
  currentSlug,
}: Props) {
  const router = useRouter()

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (passenger) {
      reset({
        firstName: passenger.firstName,
        lastName: passenger.lastName,
        documentTypeId: passenger.documentType.id,
        documentNumber: passenger.documentNumber,
        countryId: passenger.country.id,
        birthDate: passenger.birthDate
          ? format(new Date(passenger.birthDate), "yyyy-MM-dd")
          : "",
        phone: passenger.phone ?? "",
      })
    }
  }, [passenger, reset])

  useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  const isEditing = !!passenger

  async function onSubmit(data: FormValues) {
    const result = isEditing
      ? await updatePassenger({ id: passenger.id, ...data, currentSlug })
      : await createPassenger({ ...data, currentSlug })
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success(isEditing ? "Pasajero actualizado" : "Pasajero creado")
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Editar pasajero" : "Nuevo pasajero"}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 px-4 pb-8">
          <div className="flex gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="firstName">Nombre</Label>
              <Input id="firstName" placeholder="Juan" {...register("firstName")} />
              {errors.firstName && (
                <p className="text-xs text-destructive">{errors.firstName.message}</p>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="lastName">Apellido</Label>
              <Input id="lastName" placeholder="Pérez" {...register("lastName")} />
              {errors.lastName && (
                <p className="text-xs text-destructive">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="documentTypeId">Tipo de documento</Label>
            <Select
              defaultValue={passenger?.documentType.id}
              onValueChange={(val) => setValue("documentTypeId", val)}
            >
              <SelectTrigger id="documentTypeId" className="w-full">
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map((dt) => (
                  <SelectItem key={dt.id} value={dt.id}>{dt.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.documentTypeId && (
              <p className="text-xs text-destructive">{errors.documentTypeId.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="documentNumber">Número de documento</Label>
            <Input id="documentNumber" placeholder="V-12345678" {...register("documentNumber")} />
            {errors.documentNumber && (
              <p className="text-xs text-destructive">{errors.documentNumber.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="countryId">País</Label>
            <Select
              defaultValue={passenger?.country.id}
              onValueChange={(val) => setValue("countryId", val)}
            >
              <SelectTrigger id="countryId" className="w-full">
                <SelectValue placeholder="Seleccionar país" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.countryId && (
              <p className="text-xs text-destructive">{errors.countryId.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="birthDate">Fecha de nacimiento (opcional)</Label>
            <Input id="birthDate" type="date" {...register("birthDate")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Teléfono (opcional)</Label>
            <Input id="phone" type="tel" placeholder="+54 9 11 1234 5678" {...register("phone")} />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear pasajero"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
