import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getTripSchedulesByBranch } from "@/lib/services/trip-schedule.service"
import { getProveedorTypes, getDocumentTypes } from "@/lib/services/proveedor.service"
import { AgencySidebar } from "@/components/agency-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { IconArrowLeft } from "@tabler/icons-react"
import { NuevaReservaForm } from "./_components/nueva-reserva-form"

export default async function NuevaReservaPasajeroPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ fecha?: string }>
}) {
  const { slug } = await params
  const { fecha } = await searchParams

  const session = await auth()
  const user = {
    name: session?.user?.name ?? "",
    email: session?.user?.email ?? "",
  }

  const branch = await prisma.branch.findUnique({ where: { slug } })

  const [proveedorTypes, documentTypes, schedules] = await Promise.all([
    getProveedorTypes(),
    getDocumentTypes(),
    branch ? getTripSchedulesByBranch(branch.id) : Promise.resolve([]),
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
      <AgencySidebar variant="inset" slug={slug} user={user} />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="flex items-center justify-between px-4 lg:px-6">
                <h1 className="text-xl font-semibold">Nueva Reserva</h1>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/${slug}/calendario`}>
                    <IconArrowLeft className="size-4" />
                    Volver al Calendario
                  </Link>
                </Button>
              </div>
              <NuevaReservaForm
                fecha={fecha ?? null}
                schedules={schedules}
                proveedorTypes={proveedorTypes}
                documentTypes={documentTypes}
                slug={slug}
                branchId={branch?.id ?? ""}
              />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
