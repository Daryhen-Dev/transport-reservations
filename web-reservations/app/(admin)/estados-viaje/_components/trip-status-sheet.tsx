"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconPlus } from "@tabler/icons-react"
import { createTripStatus, updateTripStatus } from "@/app/actions/trip-status"
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
  name: z.string().min(1, "El nombre es requerido"),
})
type FormValues = z.infer<typeof schema>

type TripStatus = { id: string; name: string }
type Props = {
  currentSlug?: string
  status?: TripStatus
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: boolean
}

export function TripStatusSheet({ currentSlug = '', status, open, onOpenChange, trigger = true }: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined && onOpenChange !== undefined
  const isOpen = isControlled ? open : internalOpen
  const setOpen = isControlled ? onOpenChange : setInternalOpen

  const router = useRouter()
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (isOpen) reset({ name: status?.name ?? "" })
  }, [isOpen, status, reset])

  async function onSubmit(data: FormValues) {
    const payload = { ...data, name: data.name.toUpperCase(), currentSlug}
    const result = status
      ? await updateTripStatus(status.id, payload)
      : await createTripStatus(payload)
    if (result.error) { toast.error(result.error); return }
    toast.success(status ? "Estado actualizado" : "Estado creado")
    reset()
    setOpen(false)
    router.refresh()
  }

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      {trigger && (
        <SheetTrigger asChild>
          <Button size="sm"><IconPlus className="size-4" />Nuevo estado</Button>
        </SheetTrigger>
      )}
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{status ? "Editar estado" : "Nuevo estado"}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 px-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              placeholder="ABIERTO"
              className="uppercase"
              {...register("name", { onChange: (e) => { e.target.value = e.target.value.toUpperCase() } })}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (status ? "Guardando..." : "Creando...") : (status ? "Guardar cambios" : "Crear estado")}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
