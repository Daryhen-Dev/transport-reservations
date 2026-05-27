import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants";
import { requireActiveBranch } from "@/lib/branch-context";
import { prisma } from "@/lib/db";
import { AgencySidebar } from "@/components/agency-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  const role = (session?.user as { role?: string } | undefined)?.role;
  const isAllowed = role === "OWNER" || role === "SUCURSAL_USER";
  if (!session || !isAllowed) {
    redirect(ROUTES.LOGIN);
  }

  const branch = await requireActiveBranch();
  const isOwner = role === "OWNER";

  const branches = isOwner
    ? await prisma.branch.findMany({
        select: { id: true, name: true, slug: true },
        orderBy: { createdAt: "asc" },
      })
    : [{ id: branch.id, name: branch.name, slug: branch.slug }];

  const user = {
    name: session.user?.name ?? "",
    email: session.user?.email ?? "",
    avatar: "",
  };

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AgencySidebar
        variant="inset"
        user={user}
        isOwner={isOwner}
        activeBranch={{ id: branch.id, name: branch.name, slug: branch.slug }}
        branches={branches}
        switcherDisabled={!isOwner}
      />
      <SidebarInset>
        <SiteHeader userName={user.name} branchName={branch.name} />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
