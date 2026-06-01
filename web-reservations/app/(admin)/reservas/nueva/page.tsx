import { prisma } from "@/lib/db"
import { requireActiveBranch } from "@/lib/branch-context"
import { getTripSchedulesByBranch } from "@/lib/services/trip-schedule.service"
import { getProveedorTypes, getDocumentTypes } from "@/lib/services/proveedor.service"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { IconArrowLeft } from "@tabler/icons-react"
import { NuevaReservaSelector } from "./_components/nueva-reserva-selector"

export default async function NuevaReservaPasajeroPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>
}) {
  const { fecha } = await searchParams
  const branch = await requireActiveBranch()

  const [proveedorTypes, documentTypes, schedules, categorias, branches, agencies] =
    await Promise.all([
      getProveedorTypes(),
      getDocumentTypes(),
      getTripSchedulesByBranch(branch.id),
      prisma.cargaCategoria.findMany({ orderBy: { name: "asc" } }),
      prisma.branch.findMany({ orderBy: { name: "asc" } }),
      prisma.proveedor.findMany({
        where: { proveedorType: { name: "AGENCIA" } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          companyName: true,
        },
        orderBy: [{ companyName: "asc" }, { firstName: "asc" }],
      }),
    ])

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <h1 className="text-xl font-semibold">Nueva Reserva</h1>
        <Button variant="outline" size="sm" asChild>
          <Link href="/calendario">
            <IconArrowLeft className="size-4" />
            Volver al Calendario
          </Link>
        </Button>
      </div>
      <NuevaReservaSelector
        fecha={fecha ?? null}
        schedules={schedules}
        proveedorTypes={proveedorTypes}
        documentTypes={documentTypes}
        branchId={branch.id}
        categorias={categorias}
        branches={branches}
        agencies={agencies}
      />
    </div>
  )
}
