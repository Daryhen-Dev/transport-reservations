import Link from "next/link"
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
  IconChartBar,
  IconShoppingCart,
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

type BranchSummary = { id: string; name: string; slug: string }

const generalItems = [
  { title: "Dashboard", url: "/dashboard", icon: IconDashboard },
]

const adminItems = [
  { title: "Sucursales", url: "/sucursales", icon: IconBuilding },
  { title: "Usuarios", url: "/usuarios", icon: IconUsers },
  { title: "Países", url: "/paises", icon: IconWorld },
  { title: "Rutas", url: "/rutas", icon: IconRoute },
  { title: "Horarios", url: "/horarios", icon: IconClock },
  { title: "Estados de Viaje", url: "/estados-viaje", icon: IconFlag },
]

const operationsItems = [
  { title: "Calendario", url: "/calendario", icon: IconCalendarMonth },
  { title: "Viajes", url: "/viajes", icon: IconCalendar },
  { title: "Tripulación", url: "/tripulacion", icon: IconAnchor },
  { title: "Proveedores", url: "/proveedores", icon: IconUsers },
  { title: "Pasajeros", url: "/pasajeros", icon: IconUsersGroup },
  { title: "Reservas", url: "/reservas", icon: IconLayoutList },
  { title: "Manifiestos", url: "/manifiestos", icon: IconFileText },
  { title: "Encomiendas", url: "/encomiendas", icon: IconPackage },
  { title: "Ventas externas", url: "/ventas-externas", icon: IconShoppingCart },
  { title: "Reportes", url: "/reportes", icon: IconChartBar },
]

type AgencySidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: { name: string; email: string; avatar: string }
  isOwner: boolean
  activeBranch: BranchSummary
  branches: BranchSummary[]
  switcherDisabled?: boolean
}

export function AgencySidebar({
  user,
  isOwner,
  activeBranch,
  branches,
  switcherDisabled,
  ...props
}: AgencySidebarProps) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            {isOwner && branches.length > 0 ? (
              <BranchSwitcher
                activeBranch={activeBranch}
                branches={branches}
                disabled={switcherDisabled}
              />
            ) : (
              <SidebarMenuButton
                asChild
                className="data-[slot=sidebar-menu-button]:p-1.5!"
              >
                <Link href="/calendario">
                  <IconInnerShadowTop className="size-5!" />
                  <span className="text-base font-semibold">
                    {activeBranch.name}
                  </span>
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
              {generalItems.map((item) => (
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

        {isOwner && (
          <SidebarGroup>
            <SidebarGroupLabel>Administrador</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
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
              {operationsItems.map((item) => (
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
        <NavUser user={user} signOutRedirect="/login" />
      </SidebarFooter>
    </Sidebar>
  )
}
