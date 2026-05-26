"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconPlus } from "@tabler/icons-react"
import { format } from "date-fns"
import { createCrewMember, updateCrewMember } from "@/app/actions/crew-member"
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
import type { CrewMemberRow } from "@/lib/services/crew-member.service"

const schema = z.object({
  firstName: z.string().min(1, "El nombre es requerido"),
  lastName: z.string().min(1, "El apellido es requerido"),
  documentTypeId: z.string().min(1, "El tipo de documento es requerido"),
  documentNumber: z.string().min(1, "El número de documento es requerido"),
  phone: z.string().optional(),
  birthDate: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

type DocumentType = { id: string; name: string }

type Props = {
  currentSlug?: string
  documentTypes: DocumentType[]
  crewMember?: CrewMemberRow
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: boolean
}

export function CrewMemberSheet({
  currentSlug = '',
  documentTypes,
  crewMember,
  open,
  onOpenChange,
  trigger = true,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined && onOpenChange !== undefined
  const isOpen = isControlled ? open : internalOpen
  const setOpen = isControlled ? onOpenChange : setInternalOpen

  const router = useRouter()
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const documentTypeId = watch("documentTypeId")

  useEffect(() => {
    if (isOpen) {
      reset({
        firstName: crewMember?.firstName ?? "",
        lastName: crewMember?.lastName ?? "",
        documentTypeId: crewMember?.documentType.id ?? "",
        documentNumber: crewMember?.documentNumber ?? "",
        phone: crewMember?.phone ?? "",
        birthDate: crewMember?.birthDate
          ? format(new Date(crewMember.birthDate), "yyyy-MM-dd")
          : "",
      })
    }
  }, [isOpen, crewMember, reset])

  async function onSubmit(data: FormValues) {
    const payload = { ...data, currentSlug}
    const result = crewMember
      ? await updateCrewMember(crewMember.id, payload)
      : await createCrewMember(payload)

    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success(crewMember ? "Tripulante actualizado" : "Tripulante creado")
    reset()
    setOpen(false)
    router.refresh()
  }

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      {trigger && (
        <SheetTrigger asChild>
          <Button size="sm">
            <IconPlus className="size-4" />
            Nuevo tripulante
          </Button>
        </SheetTrigger>
      )}
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{crewMember ? "Editar tripulante" : "Nuevo tripulante"}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 px-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="firstName">Nombre</Label>
              <Input id="firstName" placeholder="Juan" {...register("firstName")} />
              {errors.firstName && (
                <p className="text-sm text-destructive">{errors.firstName.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lastName">Apellido</Label>
              <Input id="lastName" placeholder="Pérez" {...register("lastName")} />
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
            <Label htmlFor="documentNumber">Número de documento</Label>
            <Input id="documentNumber" placeholder="V-12345678" {...register("documentNumber")} />
            {errors.documentNumber && (
              <p className="text-sm text-destructive">{errors.documentNumber.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Teléfono (opcional)</Label>
            <Input id="phone" placeholder="+58 412 000 0000" {...register("phone")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="birthDate">Fecha de nacimiento (opcional)</Label>
            <Input id="birthDate" type="date" {...register("birthDate")} />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? crewMember ? "Guardando..." : "Creando..."
              : crewMember ? "Guardar cambios" : "Crear tripulante"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
