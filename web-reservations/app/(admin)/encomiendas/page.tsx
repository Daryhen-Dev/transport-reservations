import { prisma } from "@/lib/db"
import { requireActiveBranch } from "@/lib/branch-context"
import { getCargoByBranch } from "@/lib/services/cargo.service"
import { EncomiendасTable } from "./_components/encomiendas-table"

export default async function EncomiendасPage() {
  const branch = await requireActiveBranch()

  const [cargo, cargoStatuses] = await Promise.all([
    getCargoByBranch(branch.id),
    prisma.cargoStatus.findMany({ orderBy: { name: "asc" } }),
  ])

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <h1 className="text-2xl font-semibold">Encomiendas</h1>
        <p className="text-sm text-muted-foreground">
          Gestioná el estado de las encomiendas en tránsito y entregadas
        </p>
      </div>
      <EncomiendасTable
        data={cargo}
        cargoStatuses={cargoStatuses}
        currentBranchId={branch.id}
      />
    </div>
  )
}
