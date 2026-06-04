"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconX, IconUserCheck, IconPlus } from "@tabler/icons-react"
import { formatDateTimeShort } from "@/lib/format-date"
import { Autocomplete } from "@/components/ui/autocomplete"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { api, ApiError } from "@/lib/api/client"
import { QuickCrewMemberSheet } from "./quick-crew-member-sheet"

const MAX_TRIPULANTES = 2

type CrewMemberResult = {
  id: string
  firstName: string
  lastName: string
  documentNumber: string
  documentType: { id: string; name: string }
}

type CrewAssignment = {
  crewMemberId: string
  crewRoleId: string
  crewMember: { id: string; firstName: string; lastName: string }
  crewRole: { id: string; name: string }
}

type CrewRole = { id: string; name: string }

type PassengerReservationSummary = {
  id: string
  seatCount: number
  _count: { passengers: number }
  reservationStatus: { name: string }
}

type Trip = {
  id: string
  departureAt: Date
  route: { origin: string; destination: string }
  crew: CrewAssignment[]
  passengerReservations: PassengerReservationSummary[]
}

function allPassengersAssigned(trip: Trip): boolean {
  return trip.passengerReservations.every(
    (r) => r._count.passengers >= r.seatCount
  )
}

type Props = {
  trip: Trip | null
  open: boolean
  onOpenChange: (open: boolean) => void
  crewRoles: CrewRole[]
  documentTypes: { id: string; name: string }[]
}

function getDisplayName(m: CrewMemberResult): string {
  return `${m.firstName} ${m.lastName} — ${m.documentType.name} ${m.documentNumber}`
}

type SlotKey = "captain" | "tripulante-new"

export function TripCrewSheet({
  trip,
  open,
  onOpenChange,
  crewRoles,
  documentTypes,
}: Props) {
  const router = useRouter()

  const [pending, setPending] = useState<Record<SlotKey, CrewMemberResult | null>>({
    captain: null,
    "tripulante-new": null,
  })
  const [pendingDisplay, setPendingDisplay] = useState<Record<SlotKey, string>>({
    captain: "",
    "tripulante-new": "",
  })
  const [assigning, setAssigning] = useState<Record<SlotKey, boolean>>({
    captain: false,
    "tripulante-new": false,
  })
  const [removing, setRemoving] = useState<Record<string, boolean>>({})
  const [quickOpen, setQuickOpen] = useState<SlotKey | null>(null)
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  const captainRole = crewRoles.find((r) => r.name === "CAPITAN")
  const tripulanteRole = crewRoles.find((r) => r.name === "TRIPULANTE")

  if (!trip || !captainRole || !tripulanteRole) return null

  const captainAssignment = trip.crew.find((c) => c.crewRole.name === "CAPITAN")
  const tripulanteAssignments = trip.crew.filter((c) => c.crewRole.name === "TRIPULANTE")
  const canAddTripulante = tripulanteAssignments.length < MAX_TRIPULANTES

  async function handleAssign(slot: SlotKey) {
    const candidate = pending[slot]
    if (!candidate) return
    const roleId = slot === "captain" ? captainRole!.id : tripulanteRole!.id

    setAssigning((prev) => ({ ...prev, [slot]: true }))
    try {
      const result = await api.trips.assignCrew(trip!.id, candidate.id, {
        crewRoleId: roleId,
      })
      toast.success("Tripulante asignado")
      setPending((prev) => ({ ...prev, [slot]: null }))
      setPendingDisplay((prev) => ({ ...prev, [slot]: "" }))
      router.refresh()

      // Capitán asignado + asientos completos → ofrecer cerrar.
      if (result.hasMinimumCrew && allPassengersAssigned(trip!)) {
        setCloseDialogOpen(true)
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Error al asignar tripulante")
    } finally {
      setAssigning((prev) => ({ ...prev, [slot]: false }))
    }
  }

  async function handleClose() {
    setIsClosing(true)
    try {
      await api.trips.close(trip!.id)
      toast.success("Viaje cerrado")
      setCloseDialogOpen(false)
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Error al cerrar el viaje")
    } finally {
      setIsClosing(false)
    }
  }

  async function handleRemove(crewMemberId: string) {
    setRemoving((prev) => ({ ...prev, [crewMemberId]: true }))
    try {
      await api.trips.removeCrew(trip!.id, crewMemberId)
      toast.success("Tripulante removido")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Error al quitar tripulante")
    } finally {
      setRemoving((prev) => ({ ...prev, [crewMemberId]: false }))
    }
  }

  function handleCreated(slot: SlotKey, member: CrewMemberResult) {
    setPending((prev) => ({ ...prev, [slot]: member }))
    setPendingDisplay((prev) => ({ ...prev, [slot]: getDisplayName(member) }))
    setQuickOpen(null)
  }

  const tripLabel = `${formatDateTimeShort(trip.departureAt)} — ${trip.route.origin} → ${trip.route.destination}`

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Tripulación del viaje</SheetTitle>
            <p className="text-sm text-muted-foreground capitalize">{tripLabel}</p>
          </SheetHeader>

          <div className="flex flex-col gap-5 px-4 pt-2">
            {/* Capitán — obligatorio, máximo 1 */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Capitán</span>
                <span className="text-xs text-muted-foreground">(obligatorio)</span>
                {captainAssignment && (
                  <Badge variant="secondary" className="text-xs">
                    <IconUserCheck className="mr-1 size-3" />
                    Asignado
                  </Badge>
                )}
              </div>

              {captainAssignment ? (
                <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
                  <span className="text-sm font-medium">
                    {captainAssignment.crewMember.firstName} {captainAssignment.crewMember.lastName}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive hover:text-destructive"
                    disabled={removing[captainAssignment.crewMemberId]}
                    onClick={() => handleRemove(captainAssignment.crewMemberId)}
                  >
                    <IconX className="size-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Autocomplete<CrewMemberResult>
                    searchFn={(query) => api.crewMembers.search(query)}
                    displayFn={getDisplayName}
                    value={pendingDisplay.captain}
                    onSelect={(m) => {
                      setPending((prev) => ({ ...prev, captain: m }))
                      setPendingDisplay((prev) => ({
                        ...prev,
                        captain: m ? getDisplayName(m) : "",
                      }))
                    }}
                    placeholder="Buscar tripulante..."
                    onAddNew={() => setQuickOpen("captain")}
                    addNewLabel="Crear nuevo tripulante"
                  />
                  {pending.captain && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={assigning.captain}
                      onClick={() => handleAssign("captain")}
                    >
                      {assigning.captain ? "Asignando..." : "Confirmar asignación"}
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Tripulantes — variable 0 a 2 */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Tripulantes</span>
                <span className="text-xs text-muted-foreground">
                  ({tripulanteAssignments.length}/{MAX_TRIPULANTES})
                </span>
              </div>

              {tripulanteAssignments.map((a) => (
                <div
                  key={a.crewMemberId}
                  className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2"
                >
                  <span className="text-sm font-medium">
                    {a.crewMember.firstName} {a.crewMember.lastName}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive hover:text-destructive"
                    disabled={removing[a.crewMemberId]}
                    onClick={() => handleRemove(a.crewMemberId)}
                  >
                    <IconX className="size-3.5" />
                  </Button>
                </div>
              ))}

              {canAddTripulante && (
                <div className="flex flex-col gap-2">
                  <Autocomplete<CrewMemberResult>
                    searchFn={(query) => api.crewMembers.search(query)}
                    displayFn={getDisplayName}
                    value={pendingDisplay["tripulante-new"]}
                    onSelect={(m) => {
                      setPending((prev) => ({ ...prev, "tripulante-new": m }))
                      setPendingDisplay((prev) => ({
                        ...prev,
                        "tripulante-new": m ? getDisplayName(m) : "",
                      }))
                    }}
                    placeholder={
                      tripulanteAssignments.length === 0
                        ? "Buscar tripulante (opcional)..."
                        : "Agregar otro tripulante..."
                    }
                    onAddNew={() => setQuickOpen("tripulante-new")}
                    addNewLabel="Crear nuevo tripulante"
                  />
                  {pending["tripulante-new"] && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={assigning["tripulante-new"]}
                      onClick={() => handleAssign("tripulante-new")}
                    >
                      <IconPlus className="size-3.5" />
                      {assigning["tripulante-new"] ? "Asignando..." : "Agregar tripulante"}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Listo para cerrar</AlertDialogTitle>
            <AlertDialogDescription>
              Hay capitán asignado y todos los asientos reservados tienen
              pasajero. Podés cerrar el viaje ahora o seguir agregando
              tripulantes y cerrarlo después.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClosing}>Seguir editando</AlertDialogCancel>
            <AlertDialogAction onClick={handleClose} disabled={isClosing}>
              {isClosing ? "Cerrando..." : "Cerrar viaje"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <QuickCrewMemberSheet
        open={!!quickOpen}
        onOpenChange={(o) => { if (!o) setQuickOpen(null) }}
        documentTypes={documentTypes}
        onCreated={(member) => {
          if (quickOpen) handleCreated(quickOpen, member)
        }}
      />
    </>
  )
}
