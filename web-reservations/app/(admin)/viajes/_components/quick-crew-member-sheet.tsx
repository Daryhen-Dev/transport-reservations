"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { format } from "date-fns"
import { createCrewMember } from "@/app/actions/crew-member"
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
  phone: z.string().optional(),
  birthDate: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

type CreatedMember = {
  id: string
  firstName: string
  lastName: string
  documentNumber: string
  documentType: { id: string; name: string }
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentTypes: { id: string; name: string }[]
  currentSlug?: string
  onCreated: (member: CreatedMember) => void
}

export function QuickCrewMemberSheet({
  open,
  onOpenChange,
  documentTypes,
  currentSlug,
  onCreated,
}: Props) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const documentTypeId = watch("documentTypeId")

  useEffect(() => {
    if (open) reset()
  }, [open, reset])

  async function onSubmit(data: FormValues) {
    const result = await createCrewMember({ ...data, currentSlug})
    if (result.error) {
      toast.error(result.error)
      return
    }

    // Find the documentType object to pass back
    const docType = documentTypes.find((d) => d.id === data.documentTypeId)!
    onCreated({
      id: (result as { id?: string }).id ?? "",
      firstName: data.firstName,
      lastName: data.lastName,
      documentNumber: data.documentNumber,
      documentType: docType,
    })
    toast.success("Tripulante creado")
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Nuevo tripulante</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 px-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="q-firstName">Nombre</Label>
              <Input id="q-firstName" placeholder="Juan" {...register("firstName")} />
              {errors.firstName && (
                <p className="text-sm text-destructive">{errors.firstName.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="q-lastName">Apellido</Label>
              <Input id="q-lastName" placeholder="Pérez" {...register("lastName")} />
              {errors.lastName && (
                <p className="text-sm text-destructive">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Tipo de documento</Label>
            <Select value={documentTypeId} onValueChange={(v) => setValue("documentTypeId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccioná un tipo" />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map((dt) => (
                  <SelectItem key={dt.id} value={dt.id}>
                    {dt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.documentTypeId && (
              <p className="text-sm text-destructive">{errors.documentTypeId.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="q-documentNumber">Número de documento</Label>
            <Input id="q-documentNumber" placeholder="V-12345678" {...register("documentNumber")} />
            {errors.documentNumber && (
              <p className="text-sm text-destructive">{errors.documentNumber.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="q-phone">Teléfono (opcional)</Label>
            <Input id="q-phone" placeholder="+58 412 000 0000" {...register("phone")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="q-birthDate">Fecha de nacimiento (opcional)</Label>
            <Input id="q-birthDate" type="date" {...register("birthDate")} />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creando..." : "Crear y asignar"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
