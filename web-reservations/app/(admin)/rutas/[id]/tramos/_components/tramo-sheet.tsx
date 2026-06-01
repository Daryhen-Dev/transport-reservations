"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { api, ApiError } from "@/lib/api/client"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
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

export type Operator = {
  id: string
  firstName: string | null
  lastName: string | null
  companyName: string | null
  proveedorTypeName: string
}

export type SegmentRow = {
  id: string
  position: number
  origin: string
  destination: string
  isExternal: boolean
  operatorProveedorId: string | null
  externalCostAmount: string | null
  notes: string | null
  operatorProveedor: {
    id: string
    firstName: string | null
    lastName: string | null
    companyName: string | null
    proveedorTypeName: string
  } | null
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  routeId: string
  segment: SegmentRow | null
  operators: Operator[]
  defaultPosition: number
}

function operatorLabel(o: Operator): string {
  const name =
    o.companyName ?? `${o.firstName ?? ""} ${o.lastName ?? ""}`.trim() ?? o.id
  return `${name} (${o.proveedorTypeName})`
}

function parseOptionalNumber(s: string): number | null {
  if (s === "") return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export function TramoSheet({
  open,
  onOpenChange,
  routeId,
  segment,
  operators,
  defaultPosition,
}: Props) {
  const router = useRouter()
  const isEdit = segment !== null

  const [position, setPosition] = useState<number>(defaultPosition)
  const [origin, setOrigin] = useState<string>("")
  const [destination, setDestination] = useState<string>("")
  const [isExternal, setIsExternal] = useState<boolean>(false)
  const [operatorId, setOperatorId] = useState<string>("")
  const [cost, setCost] = useState<string>("")
  const [notes, setNotes] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      if (segment) {
        setPosition(segment.position)
        setOrigin(segment.origin)
        setDestination(segment.destination)
        setIsExternal(segment.isExternal)
        setOperatorId(segment.operatorProveedorId ?? "")
        setCost(segment.externalCostAmount ?? "")
        setNotes(segment.notes ?? "")
      } else {
        setPosition(defaultPosition)
        setOrigin("")
        setDestination("")
        setIsExternal(false)
        setOperatorId("")
        setCost("")
        setNotes("")
      }
    }
  }, [open, segment, defaultPosition])

  async function handleSubmit() {
    if (!origin.trim() || !destination.trim()) {
      toast.error("Completá origen y destino")
      return
    }
    if (isExternal && !operatorId) {
      toast.error("Seleccioná el operador externo")
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        position,
        origin: origin.trim(),
        destination: destination.trim(),
        isExternal,
        operatorProveedorId: operatorId || null,
        externalCostAmount: parseOptionalNumber(cost),
        notes: notes.trim() === "" ? null : notes.trim(),
      }
      if (isEdit && segment) {
        await api.routeSegments.update(segment.id, payload)
        toast.success("Tramo actualizado")
      } else {
        await api.routeSegments.create({ routeId, ...payload })
        toast.success("Tramo creado")
      }
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Error al guardar")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar tramo" : "Nuevo tramo"}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-8">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="position">Orden</Label>
            <Input
              id="position"
              type="number"
              min={1}
              value={position}
              onChange={(e) => setPosition(Number(e.target.value))}
              className="w-32"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="origin">Origen</Label>
            <Input
              id="origin"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="San Cristóbal"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="destination">Destino</Label>
            <Input
              id="destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Isabela"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="isExternal"
              checked={isExternal}
              onCheckedChange={(v) => {
                const next = v === true
                setIsExternal(next)
                if (!next) setOperatorId("")
              }}
            />
            <Label htmlFor="isExternal" className="font-normal cursor-pointer">
              Tramo operado por un proveedor externo
            </Label>
          </div>

          {isExternal && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="operator">Operador (AGENCIA/EMPRESA)</Label>
                <Select value={operatorId} onValueChange={setOperatorId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar operador" />
                  </SelectTrigger>
                  <SelectContent>
                    {operators.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No hay proveedores AGENCIA o EMPRESA disponibles
                      </div>
                    ) : (
                      operators.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {operatorLabel(o)}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cost">Costo externo (USD)</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  min={0}
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="Lo que cobra el operador por pasajero"
                />
              </div>
            </>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contacto, horario, acuerdo..."
            />
          </div>

          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting
              ? "Guardando..."
              : isEdit
                ? "Guardar cambios"
                : "Crear tramo"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
