"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import {
  IconInnerShadowTop,
  IconChevronDown,
  IconCheck,
  IconLoader2,
} from "@tabler/icons-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenuButton } from "@/components/ui/sidebar"
import { api } from "@/lib/api/client"

type Branch = { id: string; name: string; slug: string }

type Props = {
  activeBranch: Branch
  branches: Branch[]
  disabled?: boolean
}

export function BranchSwitcher({ activeBranch, branches, disabled }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const isDisabled = disabled || branches.length <= 1

  function handleSwitch(branchId: string) {
    if (branchId === activeBranch.id) return
    startTransition(async () => {
      try {
        await api.branches.setActive(branchId)
        router.refresh()
      } catch {
        // Silent fail — UI stays on old branch
      }
    })
  }

  if (isDisabled) {
    return (
      <SidebarMenuButton className="data-[slot=sidebar-menu-button]:p-1.5!">
        <IconInnerShadowTop className="size-5!" />
        <span className="text-base font-semibold">{activeBranch.name}</span>
      </SidebarMenuButton>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          className="data-[slot=sidebar-menu-button]:p-1.5!"
          disabled={pending}
        >
          {pending ? (
            <IconLoader2 className="size-5! animate-spin" />
          ) : (
            <IconInnerShadowTop className="size-5!" />
          )}
          <span className="text-base font-semibold">{activeBranch.name}</span>
          <IconChevronDown className="ml-auto size-4 opacity-50" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-48">
        {branches.map((branch) => (
          <DropdownMenuItem
            key={branch.id}
            onClick={() => handleSwitch(branch.id)}
            className="gap-2"
            disabled={pending}
          >
            <IconInnerShadowTop className="size-4 opacity-60" />
            <span>{branch.name}</span>
            {branch.id === activeBranch.id && (
              <IconCheck className="ml-auto size-4" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
