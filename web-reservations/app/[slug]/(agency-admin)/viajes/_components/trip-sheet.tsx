"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconPlus } from "@tabler/icons-react"
import { createTrip, updateTrip } from "@/app/actions/trip"
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
  branchId: z.string().min(1, "Debe seleccionar una sucursal"),
  routeId: z.string().min(1, "Debe seleccionar una ruta"),
  departureDate: z.string().min(1, "Debe ingresar la fecha de salida"),
  departureTime: z.string().min(1, "Debe ingresar la hora de salida"),
})

type FormValues = z.infer<typeof schema>

type Branch = { id: string; name: string }

type Route = {
  id: string
  origin: string
  destination: string
  branchId: string
}

type Trip = {
  id: string
  departureAt: Date
  routeId: string
  branchId: string
  route: { id: string; origin: string; destination: string }
  branch: { id: string; name: string }
}

type Props = {
  currentSlug: string
  branches: Branch[]
  routes: Route[]
  trip?: Trip
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: boolean
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function formatTime(date: Date): string {
  return date.toISOString().slice(11, 16)
}

export function TripSheet({ currentSlug, branches, routes, trip, open, onOpenChange, trigger = true }: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined && onOpenChange !== undefined
  const isOpen = isControlled ? open : internalOpen
  const setOpen = isControlled ? onOpenChange : setInternalOpen

  const [selectedBranchId, setSelectedBranchId] = useState<string>(trip?.branchId ?? "")

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
      branchId: trip?.branchId ?? "",
      routeId: trip?.routeId ?? "",
      departureDate: trip ? formatDate(trip.departureAt) : "",
      departureTime: trip ? formatTime(trip.departureAt) : "",
    },
  })

  useEffect(() => {
    if (isOpen) {
      const defaultBranchId = trip?.branchId ?? ""
      setSelectedBranchId(defaultBranchId)
      reset({
        branchId: defaultBranchId,
        routeId: trip?.routeId ?? "",
        departureDate: trip ? formatDate(trip.departureAt) : "",
        departureTime: trip ? formatTime(trip.departureAt) : "",
      })
    }
  }, [isOpen, trip, reset])

  const filteredRoutes = selectedBranchId
    ? routes.filter((r) => r.branchId === selectedBranchId)
    : []

  async function onSubmit(data: FormValues) {
    const departureAt = `${data.departureDate}T${data.departureTime}:00`
    const payload = {
      departureAt,
      routeId: data.routeId,
      branchId: data.branchId,
      currentSlug,
    }
    const result = trip
      ? await updateTrip(trip.id, payload)
      : await createTrip(payload)

    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success(trip ? "Viaje actualizado" : "Viaje creado exitosamente")
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
            Nuevo viaje
          </Button>
        </SheetTrigger>
      )}
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{trip ? "Editar viaje" : "Nuevo viaje"}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 px-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="branchId">Sucursal</Label>
            <Select
              defaultValue={trip?.branchId ?? ""}
              onValueChange={(val) => {
                setValue("branchId", val)
                setValue("routeId", "")
                setSelectedBranchId(val)
              }}
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="routeId">Ruta</Label>
            <Select
              key={selectedBranchId}
              defaultValue={trip?.routeId ?? ""}
              onValueChange={(val) => setValue("routeId", val)}
              disabled={!selectedBranchId}
            >
              <SelectTrigger id="routeId" className="w-full">
                <SelectValue placeholder={selectedBranchId ? "Seleccionar ruta" : "Seleccione primero una sucursal"} />
              </SelectTrigger>
              <SelectContent>
                {filteredRoutes.map((route) => (
                  <SelectItem key={route.id} value={route.id}>
                    {route.origin} → {route.destination}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.routeId && (
              <p className="text-sm text-destructive">{errors.routeId.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="departureDate">Fecha de salida</Label>
            <Input
              id="departureDate"
              type="date"
              {...register("departureDate")}
            />
            {errors.departureDate && (
              <p className="text-sm text-destructive">{errors.departureDate.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="departureTime">Hora de salida</Label>
            <Input
              id="departureTime"
              type="time"
              {...register("departureTime")}
            />
            {errors.departureTime && (
              <p className="text-sm text-destructive">{errors.departureTime.message}</p>
            )}
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? trip ? "Guardando..." : "Creando..."
              : trip ? "Guardar cambios" : "Crear viaje"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
