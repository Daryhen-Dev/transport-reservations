"use client"

import { useState } from "react"
import { api, ApiError, type ManifestLookupResult } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { IconSearch, IconFileText, IconDownload } from "@tabler/icons-react"

export function ManifestLookup() {
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ManifestLookupResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSearch() {
    if (!code.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const manifest = await api.manifests.lookup(code)
      setResult(manifest)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al buscar manifiesto")
    } finally {
      setLoading(false)
    }
  }

  function formatDate(d: Date | string) {
    return new Date(d).toLocaleString("es-AR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 max-w-md">
        <Input
          placeholder="Ej: M2A4S1C2031A3F"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => { if (e.key === "Enter") handleSearch() }}
          className="font-mono"
        />
        <Button onClick={handleSearch} disabled={loading || !code.trim()}>
          <IconSearch className="size-4 mr-2" />
          {loading ? "Buscando..." : "Buscar"}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {result && (
        <div className="flex flex-col gap-6 max-w-4xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <div className="flex items-center gap-3">
                <IconFileText className="size-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold font-mono">{result.code}</h2>
                <Badge variant="secondary">{result.trip.status.name}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {result.trip.route.origin} → {result.trip.route.destination} · {formatDate(result.trip.departureAt)}
              </p>
              <p className="text-xs text-muted-foreground">Sucursal: {result.trip.branch.name}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => window.open(api.manifests.pdfUrl(result.code), "_blank")}
            >
              <IconDownload className="size-4 mr-2" />
              Descargar PDF
            </Button>
          </div>

          {/* Tripulación */}
          <section>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
              Tripulación ({result.trip.crew.length})
            </h3>
            {result.trip.crew.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin tripulación asignada</p>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium">Nombre</th>
                      <th className="text-left px-4 py-2 font-medium">Rol</th>
                      <th className="text-left px-4 py-2 font-medium">Documento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.trip.crew.map((c, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-4 py-2">{c.crewMember.firstName} {c.crewMember.lastName}</td>
                        <td className="px-4 py-2">{c.crewRole.name}</td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {c.crewMember.documentType.name} {c.crewMember.documentNumber}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Pasajeros */}
          <section>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
              Pasajeros ({result.trip.passengerReservations.reduce((s, r) => s + r.seatCount, 0)} asiento(s))
            </h3>
            {result.trip.passengerReservations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin reservas de pasajeros</p>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium">Nombre</th>
                      <th className="text-left px-4 py-2 font-medium">Documento</th>
                      <th className="text-left px-4 py-2 font-medium">Asientos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.trip.passengerReservations.flatMap((r, ri) =>
                      r.passengers.length > 0
                        ? r.passengers.map((rp, pi) => (
                            <tr key={`${ri}-${pi}`} className="border-t">
                              <td className="px-4 py-2">{rp.passenger.firstName} {rp.passenger.lastName}</td>
                              <td className="px-4 py-2 text-muted-foreground">
                                {rp.passenger.documentType.name} {rp.passenger.documentNumber}
                              </td>
                              <td className="px-4 py-2">{pi === 0 ? r.seatCount : ""}</td>
                            </tr>
                          ))
                        : [
                            <tr key={`${ri}-empty`} className="border-t">
                              <td className="px-4 py-2 text-muted-foreground">
                                {r.proveedor.companyName ??
                                  `${r.proveedor.firstName ?? ""} ${r.proveedor.lastName ?? ""}`.trim()}
                              </td>
                              <td className="px-4 py-2 text-muted-foreground">—</td>
                              <td className="px-4 py-2">{r.seatCount}</td>
                            </tr>,
                          ]
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Encomiendas */}
          <section>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
              Encomiendas ({result.trip.cargoReservations.length})
            </h3>
            {result.trip.cargoReservations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin encomiendas</p>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium">Remitente</th>
                      <th className="text-left px-4 py-2 font-medium">Descripción</th>
                      <th className="text-left px-4 py-2 font-medium">Peso</th>
                      <th className="text-left px-4 py-2 font-medium">Categoría</th>
                      <th className="text-left px-4 py-2 font-medium">Destinatario</th>
                      <th className="text-left px-4 py-2 font-medium">Destino</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.trip.cargoReservations.map((c, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-4 py-2">
                          {c.proveedor.companyName ??
                            `${c.proveedor.firstName ?? ""} ${c.proveedor.lastName ?? ""}`.trim()}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">{c.description ?? "—"}</td>
                        <td className="px-4 py-2">{c.weightKg} kg</td>
                        <td className="px-4 py-2">{c.categoria?.name ?? "—"}</td>
                        <td className="px-4 py-2">
                          {c.destinatario
                            ? `${c.destinatario.firstName} ${c.destinatario.lastName}`
                            : "—"}
                        </td>
                        <td className="px-4 py-2">
                          {c.destinationBranch?.name ?? c.externalDestination ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
