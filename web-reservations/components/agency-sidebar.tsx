"use client"

import Link from "next/link"
import {
  IconDashboard,
  IconBuilding,
  IconUsers,
  IconInnerShadowTop,
  IconWorld,
  IconRoute,
  IconCalendar,
  IconUserCheck,
  IconPackage,
} from "@tabler/icons-react"
import { NavUser } from "@/components/nav-user"
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
]

const operationsItems = (slug: string) => [
  { title: "Viajes", url: `/${slug}/viajes`, icon: IconCalendar },
  { title: "Reservas de Pasajeros", url: `/${slug}/reservas-pasajeros`, icon: IconUserCheck },
  { title: "Reservas de Encomiendas", url: `/${slug}/reservas-encomiendas`, icon: IconPackage },
]

export function AgencySidebar({
  slug,
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  slug: string
  user: { name: string; email: string }
}) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href={`/${slug}/dashboard`}>
                <IconInnerShadowTop className="size-5!" />
                <span className="text-base font-semibold">Panel de Agencia</span>
              </Link>
            </SidebarMenuButton>
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
        <NavUser user={{ ...user, avatar: "" }} />
      </SidebarFooter>
    </Sidebar>
  )
}
