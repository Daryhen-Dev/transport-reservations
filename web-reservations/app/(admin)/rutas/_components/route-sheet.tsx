"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconPlus } from "@tabler/icons-react"
import { createRoute, updateRoute } from "@/app/actions/route"
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
  origin: z.string().min(2, "El origen debe tener al menos 2 caracteres"),
  destination: z.string().min(2, "El destino debe tener al menos 2 caracteres"),
  branchId: z.string().min(1, "Debe seleccionar una sucursal"),
})

type FormValues = z.infer<typeof schema>

type Branch = { id: string; name: string }

type Route = {
  id: string
  origin: string
  destination: string
  branchId: string
  branch: { id: string; name: string }
}

type Props = {
  currentSlug: string
  branches: Branch[]
  route?: Route
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: boolean
}

export function RouteSheet({ currentSlug, branches, route, open, onOpenChange, trigger = true }: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined && onOpenChange !== undefined
  const isOpen = isControlled ? open : internalOpen
  const setOpen = isControlled ? onOpenChange : setInternalOpen

  const router = useRouter()
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      origin: route?.origin ?? "",
      destination: route?.destination ?? "",
      branchId: route?.branchId ?? "",
    },
  })

  useEffect(() => {
    if (isOpen) {
      reset({
        origin: route?.origin ?? "",
        destination: route?.destination ?? "",
        branchId: route?.branchId ?? "",
      })
    }
  }, [isOpen, route, reset])

  async function onSubmit(data: FormValues) {
    const payload = { ...data, currentSlug }
    const result = route
      ? await updateRoute(route.id, payload)
      : await createRoute(payload)

    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success(route ? "Ruta actualizada" : "Ruta creada exitosamente")
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
            Nueva ruta
          </Button>
        </SheetTrigger>
      )}
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{route ? "Editar ruta" : "Nueva ruta"}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 px-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="origin">Origen</Label>
            <Input id="origin" placeholder="Ciudad de origen" {...register("origin")} />
            {errors.origin && (
              <p className="text-sm text-destructive">{errors.origin.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="destination">Destino</Label>
            <Input id="destination" placeholder="Ciudad de destino" {...register("destination")} />
            {errors.destination && (
              <p className="text-sm text-destructive">{errors.destination.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="branchId">Sucursal</Label>
            <Select
              defaultValue={route?.branchId ?? ""}
              onValueChange={(val) => setValue("branchId", val)}
            >
              <SelectTrigger id="branchId" className="w-full">
                <SelectValue placeholder="Seleccionar sucursal" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.branchId && (
              <p className="text-sm text-destructive">{errors.branchId.message}</p>
            )}
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? route ? "Guardando..." : "Creando..."
              : route ? "Guardar cambios" : "Crear ruta"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
