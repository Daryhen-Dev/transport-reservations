"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconPlus } from "@tabler/icons-react"
import { createTripSchedule, updateTripSchedule } from "@/app/actions/trip-schedule"
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
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const schema = z.object({
  routeId: z.string().min(1, "Debe seleccionar una ruta"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Formato inválido (HH:MM)"),
  isActive: z.boolean().default(true),
})

type FormValues = z.infer<typeof schema>

type Route = {
  id: string
  origin: string
  destination: string
  branchId: string
}

type Schedule = {
  id: string
  routeId: string
  time: string
  isActive: boolean
  route: {
    id: string
    origin: string
    destination: string
    branchId: string
  }
}

type Props = {
  currentSlug: string
  routes: Route[]
  schedule?: Schedule
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: boolean
}

export function ScheduleSheet({ currentSlug, routes, schedule, open, onOpenChange, trigger = true }: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined && onOpenChange !== undefined
  const isOpen = isControlled ? open : internalOpen
  const setOpen = isControlled ? onOpenChange : setInternalOpen

  const router = useRouter()
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
      routeId: schedule?.routeId ?? "",
      time: schedule?.time ?? "",
      isActive: schedule?.isActive ?? true,
    },
  })

  const isActiveValue = watch("isActive")

  useEffect(() => {
    if (isOpen) {
      reset({
        routeId: schedule?.routeId ?? "",
        time: schedule?.time ?? "",
        isActive: schedule?.isActive ?? true,
      })
    }
  }, [isOpen, schedule, reset])

  async function onSubmit(data: FormValues) {
    const payload = { ...data, currentSlug }
    const result = schedule
      ? await updateTripSchedule(schedule.id, { time: data.time, isActive: data.isActive, currentSlug })
      : await createTripSchedule(payload)

    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success(schedule ? "Horario actualizado" : "Horario creado exitosamente")
    reset()
    setOpen(false)
    router.refresh()
  }

  const selectedRoute = schedule
    ? routes.find((r) => r.id === schedule.routeId)
    : null

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      {trigger && (
        <SheetTrigger asChild>
          <Button size="sm">
            <IconPlus className="size-4" />
            Nuevo horario
          </Button>
        </SheetTrigger>
      )}
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{schedule ? "Editar horario" : "Nuevo horario"}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 px-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="routeId">Ruta</Label>
            {schedule ? (
              <p className="text-sm text-muted-foreground">
                {selectedRoute
                  ? `${selectedRoute.origin} → ${selectedRoute.destination}`
                  : `${schedule.route.origin} → ${schedule.route.destination}`}
              </p>
            ) : (
              <>
                <Select
                  defaultValue=""
                  onValueChange={(val) => setValue("routeId", val)}
                >
                  <SelectTrigger id="routeId" className="w-full">
                    <SelectValue placeholder="Seleccionar ruta" />
                  </SelectTrigger>
                  <SelectContent>
                    {routes.map((route) => (
                      <SelectItem key={route.id} value={route.id}>
                        {route.origin} → {route.destination}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.routeId && (
                  <p className="text-sm text-destructive">{errors.routeId.message}</p>
                )}
              </>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="time">Hora de salida (HH:MM)</Label>
            <Input
              id="time"
              type="time"
              {...register("time")}
            />
            {errors.time && (
              <p className="text-sm text-destructive">{errors.time.message}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="isActive"
              checked={isActiveValue}
              onCheckedChange={(checked) => setValue("isActive", checked === true)}
            />
            <Label htmlFor="isActive">Activo</Label>
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? schedule ? "Guardando..." : "Creando..."
              : schedule ? "Guardar cambios" : "Crear horario"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
