"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconPlus } from "@tabler/icons-react"
import { createCountry, updateCountry } from "@/app/actions/country"
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

const schema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  nationality: z.string().min(2, "La nacionalidad debe tener al menos 2 caracteres"),
  code: z
    .string()
    .regex(/^[A-Z]{0,2}$/, "Solo letras mayúsculas (ej: VE)")
    .optional()
    .or(z.literal("")),
})

type FormValues = z.infer<typeof schema>

type Country = {
  id: string
  name: string
  nationality: string
  code: string | null
}

type Props = {
  currentSlug: string
  country?: Country
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: boolean
}

export function CountrySheet({ currentSlug, country, open, onOpenChange, trigger = true }: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined && onOpenChange !== undefined
  const isOpen = isControlled ? open : internalOpen
  const setOpen = isControlled ? onOpenChange : setInternalOpen

  const router = useRouter()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: country?.name ?? "",
      nationality: country?.nationality ?? "",
      code: country?.code ?? "",
    },
  })

  useEffect(() => {
    if (isOpen) {
      reset({
        name: country?.name ?? "",
        nationality: country?.nationality ?? "",
        code: country?.code ?? "",
      })
    }
  }, [isOpen, country, reset])

  async function onSubmit(data: FormValues) {
    const payload = { ...data, currentSlug }
    const result = country
      ? await updateCountry(country.id, payload)
      : await createCountry(payload)

    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success(country ? "País actualizado" : "País creado exitosamente")
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
            Nuevo país
          </Button>
        </SheetTrigger>
      )}
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{country ? "Editar país" : "Nuevo país"}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 px-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" placeholder="Venezuela" {...register("name")} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nationality">Nacionalidad</Label>
            <Input id="nationality" placeholder="Venezolano/a" {...register("nationality")} />
            {errors.nationality && (
              <p className="text-sm text-destructive">{errors.nationality.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="code">Código ISO (opcional)</Label>
            <Input
              id="code"
              placeholder="VE"
              maxLength={2}
              className="uppercase"
              {...register("code", {
                onChange: (e) => {
                  e.target.value = e.target.value.toUpperCase()
                },
              })}
            />
            {errors.code && (
              <p className="text-sm text-destructive">{errors.code.message}</p>
            )}
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? country ? "Guardando..." : "Creando..."
              : country ? "Guardar cambios" : "Crear país"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
