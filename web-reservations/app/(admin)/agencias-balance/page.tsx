import { requireActiveBranch } from "@/lib/branch-context"
import { getAgenciesWithBalance } from "@/lib/services/agency-balance.service"
import { AgenciesBalanceTable } from "./_components/agencies-balance-table"

export default async function AgenciasBalancePage() {
  const branch = await requireActiveBranch()
  const agencies = await getAgenciesWithBalance(branch.id)

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <h1 className="text-2xl font-semibold">Saldos con agencias</h1>
        <p className="text-sm text-muted-foreground">
          Historial de cargos (REFERIDOS + TRANSFERIDA) y pagos registrados por agencia. Las reservas canceladas no generan cargo.
        </p>
      </div>
      <AgenciesBalanceTable data={agencies} />
    </div>
  )
}
