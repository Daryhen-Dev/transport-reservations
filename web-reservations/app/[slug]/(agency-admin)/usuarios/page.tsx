import { auth } from "@/auth";
import { getUsersByAgency } from "@/lib/services/user.service";
import { getBranches } from "@/lib/services/branch.service";
import { AgencySidebar } from "@/components/agency-sidebar";
import { UsersTable } from "./_components/users-table";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function UsuariosPage({
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

  const [users, branches] = await Promise.all([
    getUsersByAgency("agency_main"),
    getBranches("agency_main"),
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
              <UsersTable
                data={users}
                currentSlug={slug}
                branches={branches}
              />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
