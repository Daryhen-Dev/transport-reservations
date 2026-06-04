"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  IconSearch,
  IconBus,
  IconUsers,
  IconBuilding,
  IconReceipt,
  IconFileText,
} from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { api, type GlobalSearchResults } from "@/lib/api/client"
import { formatDateTimeShort } from "@/lib/format-date"

type Props = {
  activeBranchId: string
}

export function GlobalSearch({ activeBranchId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<GlobalSearchResults | null>(null)
  const [loading, setLoading] = useState(false)

  // Open with Cmd+K / Ctrl+K
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  // Debounced search
  useEffect(() => {
    if (!open) return
    if (query.trim().length < 2) {
      setResults(null)
      return
    }
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await api.search.global(query.trim(), activeBranchId)
        setResults(data)
      } catch {
        setResults(null)
      } finally {
        setLoading(false)
      }
    }, 200)
    return () => clearTimeout(t)
  }, [query, open, activeBranchId])

  const go = useCallback(
    (path: string) => {
      setOpen(false)
      setQuery("")
      setResults(null)
      router.push(path)
    },
    [router]
  )

  const total =
    (results?.reservations.length ?? 0) +
    (results?.passengers.length ?? 0) +
    (results?.proveedores.length ?? 0) +
    (results?.manifests.length ?? 0) +
    (results?.trips.length ?? 0)

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <IconSearch className="size-4" />
        <span className="hidden md:inline">Buscar...</span>
        <kbd className="hidden md:inline-flex ml-2 h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
          Ctrl K
        </kbd>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Búsqueda global"
        description="Busca reservas, pasajeros, proveedores, manifiestos o viajes"
      >
        <Command shouldFilter={false}>
        <CommandInput
          placeholder="Nombre, documento, código de manifiesto, ruta..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {query.trim().length < 2 ? (
            <CommandEmpty>Escribí al menos 2 caracteres para buscar</CommandEmpty>
          ) : loading ? (
            <CommandEmpty>Buscando...</CommandEmpty>
          ) : total === 0 ? (
            <CommandEmpty>Sin resultados para &quot;{query}&quot;</CommandEmpty>
          ) : null}

          {results && results.reservations.length > 0 && (
            <CommandGroup heading="Reservas">
              {results.reservations.map((r) => (
                <CommandItem
                  key={r.id}
                  value={`reservation-${r.id}`}
                  onSelect={() => go(`/reservas/${r.id}`)}
                  className="flex items-start gap-2"
                >
                  <IconReceipt className="size-4 mt-0.5 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {r.code} · {r.proveedorName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {r.tripRoute} · {formatDateTimeShort(r.tripDate)} · {r.seatCount} asiento(s) · {r.status}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results && results.passengers.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Pasajeros">
                {results.passengers.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={`passenger-${p.id}`}
                    onSelect={() => go(`/pasajeros`)}
                    className="flex items-start gap-2"
                  >
                    <IconUsers className="size-4 mt-0.5 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {p.document} · {p.country}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {results && results.proveedores.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Proveedores">
                {results.proveedores.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={`proveedor-${p.id}`}
                    onSelect={() => go(`/proveedores`)}
                    className="flex items-start gap-2"
                  >
                    <IconBuilding className="size-4 mt-0.5 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {p.name} <span className="text-xs text-muted-foreground">({p.type})</span>
                      </span>
                      {p.document && (
                        <span className="text-xs text-muted-foreground">{p.document}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {results && results.manifests.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Manifiestos">
                {results.manifests.map((m) => (
                  <CommandItem
                    key={m.code}
                    value={`manifest-${m.code}`}
                    onSelect={() => go(`/manifiestos`)}
                    className="flex items-start gap-2"
                  >
                    <IconFileText className="size-4 mt-0.5 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span className="font-medium font-mono">{m.code}</span>
                      <span className="text-xs text-muted-foreground">
                        {m.tripRoute} · {formatDateTimeShort(m.tripDate)} · {m.branchName}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {results && results.trips.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Viajes">
                {results.trips.map((t) => (
                  <CommandItem
                    key={t.id}
                    value={`trip-${t.id}`}
                    onSelect={() => go(`/viajes/${t.id}`)}
                    className="flex items-start gap-2"
                  >
                    <IconBus className="size-4 mt-0.5 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span className="font-medium">{t.route}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTimeShort(t.departureAt)} · {t.branchName} · {t.status}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
