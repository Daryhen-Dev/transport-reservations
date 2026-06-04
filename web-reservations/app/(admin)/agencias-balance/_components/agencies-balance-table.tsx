"use client"

import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { IconChevronRight } from "@tabler/icons-react"
import type { AgencyBalanceSummary } from "@/lib/services/agency-balance.service"

function money(n: number): string {
  return `$${n.toFixed(2)}`
}

export function AgenciesBalanceTable({ data }: { data: AgencyBalanceSummary[] }) {
  return (
    <div className="px-4 lg:px-6">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agencia</TableHead>
              <TableHead className="text-right">Cargos</TableHead>
              <TableHead className="text-right">Pagado</TableHead>
              <TableHead className="text-right">Saldo a pagar</TableHead>
              <TableHead className="text-right">Reservas</TableHead>
              <TableHead className="text-right">Pagos</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                  No hay actividad con agencias en esta sucursal.
                </TableCell>
              </TableRow>
            ) : (
              data.map((a) => {
                const negative = a.balance < 0
                return (
                  <TableRow key={a.agencyId}>
                    <TableCell className="font-medium">{a.agencyName}</TableCell>
                    <TableCell className="text-right">{money(a.totalCharges)}</TableCell>
                    <TableCell className="text-right">{money(a.totalPayments)}</TableCell>
                    <TableCell className={`text-right font-medium ${negative ? "text-destructive" : ""}`}>
                      {money(a.balance)}
                    </TableCell>
                    <TableCell className="text-right">{a.chargeCount}</TableCell>
                    <TableCell className="text-right">{a.paymentCount}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild title="Ver detalle">
                        <Link href={`/agencias-balance/${a.agencyId}`}>
                          <IconChevronRight className="size-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        Saldo negativo = ya pagaste más de lo que debías (revisar cancelaciones posteriores al pago).
      </p>
    </div>
  )
}
