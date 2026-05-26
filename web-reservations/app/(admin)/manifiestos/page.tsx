import { auth } from "@/auth"
import { AgencySidebar } from "@/components/agency-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { ManifestLookup } from "./_components/manifest-lookup"

export default async function ManifiestosPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const session = await auth()
  void session

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
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
              <div>
                <h1 className="text-2xl font-semibold">Manifiestos</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Buscá un manifiesto por código para ver los detalles del viaje o descargar el PDF.
                </p>
              </div>
              <ManifestLookup currentSlug={slug} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
