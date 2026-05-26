import { prisma } from "@/lib/db"
import { getCargoByBranch } from "@/lib/services/cargo.service"
import { AgencySidebar } from "@/components/agency-sidebar"
import { EncomiendасTable } from "./_components/encomiendas-table"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default async function EncomiendасPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const branch = await prisma.branch.findUnique({ where: { slug }, select: { id: true } })
  const branchId = branch?.id ?? ""

  const [cargo, cargoStatuses] = await Promise.all([
    getCargoByBranch(branchId),
    prisma.cargoStatus.findMany({ orderBy: { name: "asc" } }),
  ])

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AgencySidebar variant="inset" slug={slug} />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
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
                currentSlug={slug}
                currentBranchId={branchId}
              />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
