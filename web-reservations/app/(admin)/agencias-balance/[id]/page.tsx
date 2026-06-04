import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { IconArrowLeft } from "@tabler/icons-react"
import { requireActiveBranch } from "@/lib/branch-context"
import { getAgencyBalanceDetail } from "@/lib/services/agency-balance.service"
import { AgencyBalanceDetailView } from "../_components/agency-balance-detail-view"

export default async function AgencyBalanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const branch = await requireActiveBranch()
  const detail = await getAgencyBalanceDetail(id, branch.id)
  if (!detail) notFound()

  // Serializar Dates a strings para cruzar al Client Component.
  const serialized = {
    agencyId: detail.agencyId,
    agencyName: detail.agencyName,
    totalCharges: detail.totalCharges,
    totalPayments: detail.totalPayments,
    balance: detail.balance,
    charges: detail.charges.map((c) => ({
      reservationId: c.reservationId,
      source: c.source,
      tripDepartureAt: c.tripDepartureAt.toISOString(),
      routeLabel: c.routeLabel,
      seatCount: c.seatCount,
      amount: c.amount,
      paidAmount: c.paidAmount,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
      passengers: c.passengers,
    })),
    payments: detail.payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      paymentDate: p.paymentDate.toISOString(),
      notes: p.notes,
      branchName: p.branchName,
      createdAt: p.createdAt.toISOString(),
    })),
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex items-center justify-between gap-2 px-4 lg:px-6">
        <h1 className="text-xl font-semibold">{detail.agencyName}</h1>
        <Button variant="outline" size="sm" asChild>
          <Link href="/agencias-balance">
            <IconArrowLeft className="size-4" />
            Volver
          </Link>
        </Button>
      </div>
      <AgencyBalanceDetailView data={serialized} branchId={branch.id} />
    </div>
  )
}
