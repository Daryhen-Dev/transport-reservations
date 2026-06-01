"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconPlus } from "@tabler/icons-react"
import { api, ApiError } from "@/lib/api/client"
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

const priceField = z.number().nonnegative("No puede ser negativo")

const schema = z.object({
  origin: z.string().min(2, "El origen debe tener al menos 2 caracteres"),
  destination: z.string().min(2, "El destino debe tener al menos 2 caracteres"),
  branchId: z.string().min(1, "Debe seleccionar una sucursal"),
  directPriceAmount: priceField,
  incomingAgencyPriceAmount: priceField,
  outgoingCommissionAmount: priceField,
  minPrice: priceField,
})

type FormValues = z.infer<typeof schema>

type Branch = { id: string; name: string }

type Route = {
  id: string
  origin: string
  destination: string
  branchId: string
  branch: { id: string; name: string }
  directPriceAmount?: string | number
  incomingAgencyPriceAmount?: string | number
  outgoingCommissionAmount?: string | number
  minPrice?: string | number
}

type Props = {
  branches: Branch[]
  route?: Route
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: boolean
}

function num(v: string | number | undefined, fallback: number): number {
  if (v === undefined || v === null || v === "") return fallback
  const n = typeof v === "string" ? Number(v) : v
  return Number.isFinite(n) ? n : fallback
}

export function RouteSheet({ branches, route, open, onOpenChange, trigger = true }: Props) {
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
      directPriceAmount: num(route?.directPriceAmount, 30),
      incomingAgencyPriceAmount: num(route?.incomingAgencyPriceAmount, 25),
      outgoingCommissionAmount: num(route?.outgoingCommissionAmount, 5),
      minPrice: num(route?.minPrice, 15),
    },
  })

  useEffect(() => {
    if (isOpen) {
      reset({
        origin: route?.origin ?? "",
        destination: route?.destination ?? "",
        branchId: route?.branchId ?? "",
        directPriceAmount: num(route?.directPriceAmount, 30),
        incomingAgencyPriceAmount: num(route?.incomingAgencyPriceAmount, 25),
        outgoingCommissionAmount: num(route?.outgoingCommissionAmount, 5),
        minPrice: num(route?.minPrice, 15),
      })
    }
  }, [isOpen, route, reset])

  async function onSubmit(data: FormValues) {
    try {
      if (route) {
        await api.routes.update(route.id, data)
      } else {
        await api.routes.create(data)
      }
      toast.success(route ? "Ruta actualizada" : "Ruta creada exitosamente")
      reset()
      setOpen(false)
      router.refresh()
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Error al guardar la ruta"
      )
    }
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
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="origin">Origen</Label>
              <Input id="origin" placeholder="San Cristóbal" {...register("origin")} />
              {errors.origin && (
                <p className="text-sm text-destructive">{errors.origin.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="destination">Destino</Label>
              <Input id="destination" placeholder="Santa Cruz" {...register("destination")} />
              {errors.destination && (
                <p className="text-sm text-destructive">{errors.destination.message}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="branchId">Sucursal de origen</Label>
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

          {/* Tarifas */}
          <div className="flex flex-col gap-3 rounded-md border bg-muted/30 p-3">
            <p className="text-sm font-medium">Tarifas</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="directPriceAmount">Precio directo *</Label>
                <Input
                  id="directPriceAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("directPriceAmount", { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">
                  Venta directa al pasajero
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="incomingAgencyPriceAmount">Desde agencia *</Label>
                <Input
                  id="incomingAgencyPriceAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("incomingAgencyPriceAmount", { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">
                  Cuando agencia nos envía pasajero
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="outgoingCommissionAmount">Comisión a agencia *</Label>
                <Input
                  id="outgoingCommissionAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("outgoingCommissionAmount", { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">
                  Cuando enviamos a otra agencia
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="minPrice">Precio mínimo *</Label>
                <Input
                  id="minPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("minPrice", { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">
                  Piso absoluto por reserva
                </p>
              </div>
            </div>
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
