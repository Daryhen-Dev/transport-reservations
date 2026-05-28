"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { IconX, IconUserCheck } from "@tabler/icons-react"
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

const ROLE_LABEL: Record<string, string> = {
  CAPITAN: "Capitán",
  PRIMER_OFICIAL: "Primer Oficial",
  MAQUINISTA: "Maquinista",
}

export function TripCrewSheet({
  trip,
  open,
  onOpenChange,
  crewRoles,
  documentTypes,
}: Props) {
  const router = useRouter()

  // Per-role state: selected candidate before confirming
  const [pending, setPending] = useState<Record<string, CrewMemberResult | null>>({})
  const [pendingDisplay, setPendingDisplay] = useState<Record<string, string>>({})
  const [assigning, setAssigning] = useState<Record<string, boolean>>({})
  const [removing, setRemoving] = useState<Record<string, boolean>>({})
  const [quickOpen, setQuickOpen] = useState<string | null>(null) // roleId for which quick sheet is open
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  if (!trip) return null

  // Build a map roleId → current assignment
  const assignmentByRole = new Map(trip.crew.map((c) => [c.crewRoleId, c]))

  async function handleAssign(roleId: string) {
    const candidate = pending[roleId]
    if (!candidate) return

    setAssigning((prev) => ({ ...prev, [roleId]: true }))
    try {
      const result = await api.trips.assignCrew(trip!.id, candidate.id, {
        crewRoleId: roleId,
      })
      toast.success("Tripulante asignado")
      setPending((prev) => ({ ...prev, [roleId]: null }))
      setPendingDisplay((prev) => ({ ...prev, [roleId]: "" }))
      router.refresh()

      // Only offer to close the trip if BOTH crew is complete AND every
      // reserved seat already has a passenger linked.
      if (result.allCrewAssigned && allPassengersAssigned(trip!)) {
        setCloseDialogOpen(true)
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Error al asignar tripulante")
    } finally {
      setAssigning((prev) => ({ ...prev, [roleId]: false }))
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

  async function handleRemove(roleId: string, crewMemberId: string) {
    setRemoving((prev) => ({ ...prev, [roleId]: true }))
    try {
      await api.trips.removeCrew(trip!.id, crewMemberId)
      toast.success("Tripulante removido")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Error al quitar tripulante")
    } finally {
      setRemoving((prev) => ({ ...prev, [roleId]: false }))
    }
  }

  function handleCreated(roleId: string, member: CrewMemberResult) {
    setPending((prev) => ({ ...prev, [roleId]: member }))
    setPendingDisplay((prev) => ({ ...prev, [roleId]: getDisplayName(member) }))
    setQuickOpen(null)
  }

  const tripLabel = `${format(new Date(trip.departureAt), "d 'de' MMMM · HH:mm", { locale: es })} — ${trip.route.origin} → ${trip.route.destination}`

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Tripulación del viaje</SheetTitle>
            <p className="text-sm text-muted-foreground capitalize">{tripLabel}</p>
          </SheetHeader>

          <div className="flex flex-col gap-5 px-4 pt-2">
            {crewRoles.map((role) => {
              const assigned = assignmentByRole.get(role.id)
              const label = ROLE_LABEL[role.name] ?? role.name
              const hasPending = !!pending[role.id]

              return (
                <div key={role.id} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{label}</span>
                    {assigned && (
                      <Badge variant="secondary" className="text-xs">
                        <IconUserCheck className="mr-1 size-3" />
                        Asignado
                      </Badge>
                    )}
                  </div>

                  {assigned ? (
                    /* Current assignment row */
                    <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
                      <span className="text-sm font-medium">
                        {assigned.crewMember.firstName} {assigned.crewMember.lastName}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive hover:text-destructive"
                        disabled={removing[role.id]}
                        onClick={() => handleRemove(role.id, assigned.crewMemberId)}
                      >
                        <IconX className="size-3.5" />
                      </Button>
                    </div>
                  ) : (
                    /* Search + assign row */
                    <div className="flex flex-col gap-2">
                      <Autocomplete<CrewMemberResult>
                        searchFn={(query) => api.crewMembers.search(query)}
                        displayFn={getDisplayName}
                        value={pendingDisplay[role.id] ?? ""}
                        onSelect={(m) => {
                          setPending((prev) => ({ ...prev, [role.id]: m }))
                          setPendingDisplay((prev) => ({
                            ...prev,
                            [role.id]: m ? getDisplayName(m) : "",
                          }))
                        }}
                        placeholder="Buscar tripulante..."
                        onAddNew={() => setQuickOpen(role.id)}
                        addNewLabel="Crear nuevo tripulante"
                      />
                      {hasPending && (
                        <Button
                          type="button"
                          size="sm"
                          disabled={assigning[role.id]}
                          onClick={() => handleAssign(role.id)}
                        >
                          {assigning[role.id] ? "Asignando..." : "Confirmar asignación"}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* Auto-close dialog — triggered when all crew roles are filled */}
      <AlertDialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Listo para cerrar</AlertDialogTitle>
            <AlertDialogDescription>
              Los 3 roles han sido asignados y todos los asientos
              reservados ya tienen pasajero. ¿Deseas cerrar el viaje
              para no aceptar más reservas?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClosing}>No, mantener abierto</AlertDialogCancel>
            <AlertDialogAction onClick={handleClose} disabled={isClosing}>
              {isClosing ? "Cerrando..." : "Sí, cerrar viaje"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Quick crew creation — one sheet per role, reuses same component */}
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
