"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { api, ApiError } from "@/lib/api/client"
import { formatDateForInput } from "@/lib/format-date"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  agencyId: string
  agencyName: string
  branchId: string
}

export function RegisterPaymentSheet({
  open,
  onOpenChange,
  agencyId,
  agencyName,
  branchId,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [amount, setAmount] = useState<string>("")
  const [paymentDate, setPaymentDate] = useState<string>(formatDateForInput(new Date()))
  const [notes, setNotes] = useState<string>("")

  useEffect(() => {
    if (!open) {
      setAmount("")
      setPaymentDate(formatDateForInput(new Date()))
      setNotes("")
    }
  }, [open])

  const amountNum = Number(amount)
  const isValid = Number.isFinite(amountNum) && amountNum > 0 && paymentDate.length > 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return
    startTransition(async () => {
      try {
        await api.agencyPayments.create({
          agencyId,
          branchId,
          amount: amountNum,
          paymentDate,
          notes: notes.trim() === "" ? undefined : notes.trim(),
        })
        toast.success("Pago registrado")
        onOpenChange(false)
        router.refresh()
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Error al registrar pago")
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Registrar pago — {agencyName}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment-amount">Monto (USD)</Label>
            <Input
              id="payment-amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Podés registrar pagos parciales — el saldo se actualiza solo.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment-date">Fecha del pago</Label>
            <Input
              id="payment-date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payment-notes">Detalle (opcional)</Label>
            <Textarea
              id="payment-notes"
              placeholder="Ej: liquidación mayo, pago parcial, transferencia bancaria #1234"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
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
            <Button type="submit" disabled={!isValid || isPending} className="flex-1">
              {isPending ? "Guardando..." : "Registrar pago"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
