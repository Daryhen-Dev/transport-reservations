"use client"

import * as React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  IconPlus,
  IconTrash,
  IconChevronRight,
  IconChevronDown,
  IconPencil,
} from "@tabler/icons-react"
import { api, ApiError } from "@/lib/api/client"
import { formatDate, formatDateTime } from "@/lib/format-date"
import { RegisterPaymentSheet } from "./register-payment-sheet"
import { EditPaymentNotesSheet } from "./edit-payment-notes-sheet"

type ChargePassenger = {
  firstName: string
  lastName: string
  documentTypeName: string | null
  documentNumber: string
  countryName: string | null
}

type ChargeStatus = "PAID" | "PARTIAL" | "PENDING"

type ChargeLine = {
  reservationId: string
  source: "REFERIDOS" | "TRANSFERIDA"
  tripDepartureAt: string
  routeLabel: string
  seatCount: number
  amount: number
  paidAmount: number
  status: ChargeStatus
  createdAt: string
  passengers: ChargePassenger[]
}

type PaymentLine = {
  id: string
  amount: number
  paymentDate: string
  notes: string | null
  branchName: string
  createdAt: string
}

type Props = {
  data: {
    agencyId: string
    agencyName: string
    totalCharges: number
    totalPayments: number
    balance: number
    charges: ChargeLine[]
    payments: PaymentLine[]
  }
  branchId: string
}

function money(n: number): string {
  return `$${n.toFixed(2)}`
}

function StatusBadge({ status }: { status: ChargeStatus }) {
  if (status === "PAID") {
    return (
      <Badge className="text-xs bg-green-100 text-green-800 hover:bg-green-100">
        Pagado
      </Badge>
    )
  }
  if (status === "PARTIAL") {
    return (
      <Badge className="text-xs bg-amber-100 text-amber-800 hover:bg-amber-100">
        Parcial
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-xs">
      Pendiente
    </Badge>
  )
}

export function AgencyBalanceDetailView({ data, branchId }: Props) {
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<PaymentLine | null>(null)
  const [deletingPayment, setDeletingPayment] = useState<PaymentLine | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [expandedCharges, setExpandedCharges] = useState<Set<string>>(new Set())

  function toggleExpanded(key: string) {
    setExpandedCharges((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function handleDelete() {
    if (!deletingPayment) return
    setIsDeleting(true)
    try {
      await api.agencyPayments.delete(deletingPayment.id)
      toast.success("Pago eliminado")
      setDeletingPayment(null)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Error al eliminar pago")
    } finally {
      setIsDeleting(false)
    }
  }

  const pendingCharges = data.charges.filter((c) => c.status !== "PAID")
  const pendingTotal = pendingCharges.reduce(
    (sum, c) => sum + (c.amount - c.paidAmount),
    0
  )
  const negative = data.balance < 0

  return (
    <>
      <div className="flex flex-col gap-6 px-4 lg:px-6">
        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SummaryCard label="Cargos totales" value={money(data.totalCharges)} />
          <SummaryCard label="Pagado" value={money(data.totalPayments)} />
          <SummaryCard
            label="Saldo a pagar"
            value={money(data.balance)}
            tone={negative ? "negative" : data.balance > 0 ? "warning" : "neutral"}
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={() => setSheetOpen(true)}>
            <IconPlus className="size-4" />
            Registrar pago
          </Button>
        </div>

        <Tabs defaultValue="pendientes" className="w-full">
          <TabsList>
            <TabsTrigger value="pendientes">
              Pendientes
              {pendingCharges.length > 0 && (
                <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-xs font-medium text-primary">
                  {pendingCharges.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="historial">Historial</TabsTrigger>
          </TabsList>

          {/* Tab: Pendientes (solo PARTIAL + PENDING) */}
          <TabsContent value="pendientes" className="mt-4 flex flex-col gap-2">
            <ChargesTable
              charges={pendingCharges}
              showStatus={true}
              expandedCharges={expandedCharges}
              onToggle={toggleExpanded}
              emptyMessage="No hay cargos pendientes. Todo saldado."
            />
            <p className="text-xs text-muted-foreground text-right">
              Total pendiente:{" "}
              <span className="font-medium">{money(pendingTotal)}</span>
            </p>
          </TabsContent>

          {/* Tab: Historial (todos los cargos + payments con edit) */}
          <TabsContent value="historial" className="mt-4 flex flex-col gap-6">
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Todas las reservas con cargo
              </h3>
              <ChargesTable
                charges={data.charges}
                showStatus={true}
                expandedCharges={expandedCharges}
                onToggle={toggleExpanded}
                emptyMessage="Sin cargos con esta agencia."
              />
              <p className="text-xs text-muted-foreground text-right">
                Total cargos:{" "}
                <span className="font-medium">{money(data.totalCharges)}</span>
              </p>
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Pagos registrados
              </h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha pago</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead>Notas</TableHead>
                      <TableHead>Registrado</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.payments.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-muted-foreground py-6"
                        >
                          Aún no hay pagos registrados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.payments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>{formatDate(p.paymentDate)}</TableCell>
                          <TableCell className="text-right font-medium">
                            {money(p.amount)}
                          </TableCell>
                          <TableCell className="max-w-md whitespace-pre-wrap text-sm text-muted-foreground">
                            {p.notes || "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDateTime(p.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Editar notas"
                                onClick={() => setEditingPayment(p)}
                              >
                                <IconPencil className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                title="Eliminar pago"
                                onClick={() => setDeletingPayment(p)}
                              >
                                <IconTrash className="size-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground text-right">
                Total pagos:{" "}
                <span className="font-medium">{money(data.totalPayments)}</span>
              </p>
            </section>
          </TabsContent>
        </Tabs>
      </div>

      <RegisterPaymentSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        agencyId={data.agencyId}
        agencyName={data.agencyName}
        branchId={branchId}
      />

      <EditPaymentNotesSheet
        payment={editingPayment}
        onOpenChange={(open) => {
          if (!open) setEditingPayment(null)
        }}
      />

      <AlertDialog
        open={!!deletingPayment}
        onOpenChange={(open) => {
          if (!open) setDeletingPayment(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar pago?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar el pago de{" "}
              {deletingPayment ? money(deletingPayment.amount) : ""} del{" "}
              {deletingPayment ? formatDate(deletingPayment.paymentDate) : ""}. El
              saldo se recalcula automáticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function ChargesTable({
  charges,
  showStatus,
  expandedCharges,
  onToggle,
  emptyMessage,
}: {
  charges: ChargeLine[]
  showStatus: boolean
  expandedCharges: Set<string>
  onToggle: (key: string) => void
  emptyMessage: string
}) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10"></TableHead>
            <TableHead>Salida</TableHead>
            <TableHead>Ruta</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Pax</TableHead>
            <TableHead className="text-right">Monto</TableHead>
            {showStatus && <TableHead>Estado</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {charges.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={showStatus ? 7 : 6}
                className="text-center text-muted-foreground py-6"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            charges.map((c) => {
              const key = `${c.source}-${c.reservationId}`
              const isExpanded = expandedCharges.has(key)
              const colSpan = showStatus ? 7 : 6
              return (
                <React.Fragment key={key}>
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onToggle(key)}
                  >
                    <TableCell>
                      {isExpanded ? (
                        <IconChevronDown className="size-4 text-muted-foreground" />
                      ) : (
                        <IconChevronRight className="size-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>{formatDate(c.tripDepartureAt)}</TableCell>
                    <TableCell>{c.routeLabel}</TableCell>
                    <TableCell>
                      <Badge
                        variant={c.source === "REFERIDOS" ? "secondary" : "outline"}
                        className="text-xs"
                      >
                        {c.source}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{c.seatCount}</TableCell>
                    <TableCell className="text-right">
                      {c.status === "PARTIAL" ? (
                        <div className="flex flex-col items-end">
                          <span className="font-medium">{money(c.amount)}</span>
                          <span className="text-xs text-muted-foreground">
                            {money(c.paidAmount)} de {money(c.amount)}
                          </span>
                        </div>
                      ) : (
                        <span className="font-medium">{money(c.amount)}</span>
                      )}
                    </TableCell>
                    {showStatus && (
                      <TableCell>
                        <StatusBadge status={c.status} />
                      </TableCell>
                    )}
                  </TableRow>
                  {isExpanded && (
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableCell colSpan={colSpan} className="p-0">
                        <PassengerList
                          passengers={c.passengers}
                          seatCount={c.seatCount}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function PassengerList({
  passengers,
  seatCount,
}: {
  passengers: ChargePassenger[]
  seatCount: number
}) {
  const missing = Math.max(0, seatCount - passengers.length)
  return (
    <div className="px-4 py-3 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium uppercase tracking-wide">Pasajeros</span>
        <span>·</span>
        <span>
          {passengers.length} de {seatCount} asignados
          {missing > 0 ? ` · faltan ${missing}` : ""}
        </span>
      </div>
      {passengers.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          Aún no hay pasajeros asignados a esta reserva.
        </p>
      ) : (
        <div className="rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Nacionalidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {passengers.map((p, i) => (
                <TableRow key={`${p.documentNumber}-${i}`}>
                  <TableCell className="font-medium">
                    {p.firstName} {p.lastName}
                  </TableCell>
                  <TableCell className="text-sm">
                    {p.documentTypeName
                      ? `${p.documentTypeName} ${p.documentNumber}`
                      : p.documentNumber}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.countryName ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: "negative" | "warning" | "neutral"
}) {
  const colorClass =
    tone === "negative"
      ? "text-destructive"
      : tone === "warning"
        ? "text-amber-600"
        : ""
  return (
    <div className="rounded-md border bg-card p-4 flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className={`text-xl font-semibold ${colorClass}`}>{value}</span>
    </div>
  )
}
