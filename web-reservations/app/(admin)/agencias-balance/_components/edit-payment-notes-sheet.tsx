"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { api, ApiError } from "@/lib/api/client"
import { formatDate } from "@/lib/format-date"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type Payment = {
  id: string
  amount: number
  paymentDate: string
  notes: string | null
}

type Props = {
  payment: Payment | null
  onOpenChange: (open: boolean) => void
}

export function EditPaymentNotesSheet({ payment, onOpenChange }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [notes, setNotes] = useState<string>("")

  const open = payment !== null

  useEffect(() => {
    if (payment) {
      setNotes(payment.notes ?? "")
    }
  }, [payment])

  if (!payment) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!payment) return
    startTransition(async () => {
      try {
        await api.agencyPayments.update(payment.id, {
          notes: notes.trim() === "" ? null : notes.trim(),
        })
        toast.success("Notas actualizadas")
        onOpenChange(false)
        router.refresh()
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : "Error al actualizar notas"
        )
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Editar notas del pago</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4">
          <div className="rounded-md border bg-muted/30 p-3 text-sm flex flex-col gap-0.5">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Pago
            </span>
            <span className="font-medium">
              ${payment.amount.toFixed(2)} · {formatDate(payment.paymentDate)}
            </span>
            <span className="text-xs text-muted-foreground">
              El monto y la fecha no se pueden editar. Si necesitás cambiarlos,
              eliminá el pago y registralo de nuevo.
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-notes">Notas</Label>
            <Textarea
              id="edit-notes"
              placeholder="Ej: liquidación mayo, pago parcial, transferencia bancaria #1234"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
