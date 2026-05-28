"use client"

import { usePathname } from "next/navigation"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { GlobalSearch } from "@/components/global-search"

const SECTION_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  calendario: "Calendario",
  viajes: "Viajes",
  rutas: "Rutas",
  horarios: "Horarios",
  reservas: "Reservas",
  encomiendas: "Encomiendas",
  pasajeros: "Pasajeros",
  proveedores: "Proveedores",
  paises: "Países",
  sucursales: "Sucursales",
  usuarios: "Usuarios",
  tripulacion: "Tripulación",
  manifiestos: "Manifiestos",
  "estados-viaje": "Estados de viaje",
}

function sectionFromPath(pathname: string): string {
  const segment = pathname.split("/").filter(Boolean)[0] ?? ""
  return SECTION_TITLES[segment] ?? ""
}

type Props = {
  userName: string
  branchName: string
  branchId: string
}

export function SiteHeader({ userName, branchName, branchId }: Props) {
  const pathname = usePathname()
  const title = sectionFromPath(pathname)

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-2 px-4 lg:gap-3 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-1 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{title}</h1>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <GlobalSearch activeBranchId={branchId} />
          <Separator
            orientation="vertical"
            className="data-[orientation=vertical]:h-4"
          />
          <span className="font-medium">{userName}</span>
          <Separator
            orientation="vertical"
            className="data-[orientation=vertical]:h-4"
          />
          <span className="text-muted-foreground">{branchName}</span>
        </div>
      </div>
    </header>
  )
}
