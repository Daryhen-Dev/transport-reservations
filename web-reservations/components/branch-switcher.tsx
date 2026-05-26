"use client"

import { usePathname, useRouter } from "next/navigation"
import {
  IconInnerShadowTop,
  IconChevronDown,
  IconCheck,
} from "@tabler/icons-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenuButton } from "@/components/ui/sidebar"

type Branch = { id: string; name: string; slug: string }

export function BranchSwitcher({
  branches,
  currentSlug,
}: {
  branches: Branch[]
  currentSlug: string
}) {
  const pathname = usePathname()
  const router = useRouter()

  const currentBranch = branches.find((b) => b.slug === currentSlug) ?? branches[0]

  function handleSwitch(slug: string) {
    if (slug === currentSlug) return
    // Extract section from pathname: /main/viajes/[id] → viajes/[id]
    const parts = pathname.split("/").filter(Boolean)
    const section = parts.slice(1).join("/") || "dashboard"
    router.push(`/${slug}/${section}`)
  }

  if (branches.length <= 1) {
    return (
      <SidebarMenuButton className="data-[slot=sidebar-menu-button]:p-1.5!">
        <IconInnerShadowTop className="size-5!" />
        <span className="text-base font-semibold">
          {currentBranch?.name ?? "Panel de Agencia"}
        </span>
      </SidebarMenuButton>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton className="data-[slot=sidebar-menu-button]:p-1.5!">
          <IconInnerShadowTop className="size-5!" />
          <span className="text-base font-semibold">
            {currentBranch?.name ?? "Panel de Agencia"}
          </span>
          <IconChevronDown className="ml-auto size-4 opacity-50" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-48">
        {branches.map((branch) => (
          <DropdownMenuItem
            key={branch.id}
            onClick={() => handleSwitch(branch.slug)}
            className="gap-2"
          >
            <IconInnerShadowTop className="size-4 opacity-60" />
            <span>{branch.name}</span>
            {branch.slug === currentSlug && (
              <IconCheck className="ml-auto size-4" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
