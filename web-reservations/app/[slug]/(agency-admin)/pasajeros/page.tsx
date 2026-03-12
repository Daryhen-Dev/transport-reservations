import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { AgencySidebar } from "@/components/agency-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { PassengersTable } from "./_components/passengers-table"

export default async function PasajerosPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const session = await auth()
  const user = {
    name: session?.user?.name ?? "",
    email: session?.user?.email ?? "",
  }

  const [passengers, documentTypes, countries] = await Promise.all([
    prisma.passenger.findMany({
      include: {
        documentType: { select: { id: true, name: true } },
        country: { select: { id: true, name: true } },
        _count: { select: { reservations: true } },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.documentType.findMany({ orderBy: { name: "asc" } }),
    prisma.country.findMany({ orderBy: { name: "asc" } }),
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
              <PassengersTable
                data={passengers}
                documentTypes={documentTypes}
                countries={countries}
                currentSlug={slug}
              />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
