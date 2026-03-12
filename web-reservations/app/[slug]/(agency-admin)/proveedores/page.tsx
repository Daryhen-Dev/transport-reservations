import { auth } from "@/auth";
import { getProveedores, getProveedorTypes, getDocumentTypes } from "@/lib/services/proveedor.service";
import { AgencySidebar } from "@/components/agency-sidebar";
import { ProveedoresTable } from "./_components/proveedores-table";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function ProveedoresPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  const user = {
    name: session?.user?.name ?? "",
    email: session?.user?.email ?? "",
  };

  const [proveedores, proveedorTypes, documentTypes] = await Promise.all([
    getProveedores(),
    getProveedorTypes(),
    getDocumentTypes(),
  ]);

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
              <ProveedoresTable
                data={proveedores}
                proveedorTypes={proveedorTypes}
                documentTypes={documentTypes}
                currentSlug={slug}
              />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
