import Link from "next/link"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import {
  IconDashboard,
  IconBuilding,
  IconUsers,
  IconInnerShadowTop,
  IconWorld,
  IconRoute,
  IconClock,
  IconCalendar,
  IconCalendarMonth,
  IconLayoutList,
  IconUsersGroup,
  IconAnchor,
  IconFlag,
  IconFileText,
  IconPackage,
} from "@tabler/icons-react"
import { NavUser } from "@/components/nav-user"
import { BranchSwitcher } from "@/components/branch-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const generalItems = (slug: string) => [
  { title: "Dashboard", url: `/${slug}/dashboard`, icon: IconDashboard },
]

const adminItems = (slug: string) => [
  { title: "Sucursales", url: `/${slug}/sucursales`, icon: IconBuilding },
  { title: "Usuarios", url: `/${slug}/usuarios`, icon: IconUsers },
  { title: "Países", url: `/${slug}/paises`, icon: IconWorld },
  { title: "Rutas", url: `/${slug}/rutas`, icon: IconRoute },
  { title: "Horarios", url: `/${slug}/horarios`, icon: IconClock },
  { title: "Estados de Viaje", url: `/${slug}/estados-viaje`, icon: IconFlag },
]

const operationsItems = (slug: string) => [
  { title: "Calendario", url: `/${slug}/calendario`, icon: IconCalendarMonth },
  { title: "Viajes", url: `/${slug}/viajes`, icon: IconCalendar },
  { title: "Tripulación", url: `/${slug}/tripulacion`, icon: IconAnchor },
  { title: "Proveedores", url: `/${slug}/proveedores`, icon: IconUsers },
  { title: "Pasajeros", url: `/${slug}/pasajeros`, icon: IconUsersGroup },
  { title: "Reservas", url: `/${slug}/reservas`, icon: IconLayoutList },
  { title: "Manifiestos", url: `/${slug}/manifiestos`, icon: IconFileText },
  { title: "Encomiendas", url: `/${slug}/encomiendas`, icon: IconPackage },
]

export async function AgencySidebar({
  slug,
  ...props
}: React.ComponentProps<typeof Sidebar> & { slug: string }) {
  const session = await auth()
  const role = session?.user?.role
  const isAgencyAdmin = role === "AGENCY_ADMIN"
  const user = {
    name: session?.user?.name ?? "",
    email: session?.user?.email ?? "",
    avatar: "",
  }

  // For AGENCY_ADMIN: fetch all branches in their agency for the switcher
  let agencyBranches: { id: string; name: string; slug: string }[] = []
  if (isAgencyAdmin && session?.user?.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        agency: {
          select: {
            branches: { select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } },
          },
        },
      },
    })
    agencyBranches = dbUser?.agency?.branches ?? []
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            {isAgencyAdmin && agencyBranches.length > 0 ? (
              <BranchSwitcher branches={agencyBranches} currentSlug={slug} />
            ) : (
              <SidebarMenuButton
                asChild
                className="data-[slot=sidebar-menu-button]:p-1.5!"
              >
                <Link href={`/${slug}/calendario`}>
                  <IconInnerShadowTop className="size-5!" />
                  <span className="text-base font-semibold">Panel de Agencia</span>
                </Link>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {generalItems(slug).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAgencyAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administrador</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems(slug).map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Operaciones</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {operationsItems(slug).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} signOutRedirect={`/${slug}/login`} />
      </SidebarFooter>
    </Sidebar>
  )
}
