"use client"

import { useState, useTransition } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { IconTrash, IconLoader, IconCheck, IconX, IconRefresh } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { Autocomplete } from "@/components/ui/autocomplete"
import { api, ApiError } from "@/lib/api/client"
import { QuickPassengerSheet } from "./quick-passenger-sheet"

type ReservationStatus = { id: string; name: string }

const STATUS_COLORS: Record<string, string> = {
  PENDIENTE: "bg-yellow-100 text-yellow-800 border-yellow-200",
  CONFIRMADA: "bg-green-100 text-green-800 border-green-200",
  CANCELADA: "bg-red-100 text-red-800 border-red-200",
}

function StatusBadge({ name }: { name: string }) {
  const color = STATUS_COLORS[name] ?? "bg-gray-100 text-gray-800 border-gray-200"
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${color}`}
    >
      {name}
    </span>
  )
}

type PassengerRecord = {
  id: string
  firstName: string
  lastName: string
  documentType: { id: string; name: string } | null
  documentNumber: string
  country: { id: string; name: string } | null
  birthDate: Date | null
}

type PassengerResult = PassengerRecord

type Props = {
  reservation: {
    id: string
    seatCount: number
    trip: {
      id: string
      departureAt: Date
      route: { id: string; origin: string; destination: string }
      branch: { id: string; name: string }
      status: { id: string; name: string }
    }
    proveedor: {
      id: string
      firstName: string | null
      lastName: string | null
      companyName: string | null
      phone: string | null
    }
    reservationStatus: { id: string; name: string }
    passengers: PassengerRecord[]
    createdAt: Date
    updatedAt: Date
    createdBy: { id: string; name: string } | null
    updatedBy: { id: string; name: string } | null
  }
  trips: Array<{
    id: string
    departureAt: Date
    route: { origin: string; destination: string }
    branch: { name: string }
  }>
  documentTypes: Array<{ id: string; name: string }>
  countries: Array<{ id: string; name: string }>
  reservationStatuses: ReservationStatus[]
}

function getPassengerDisplayValue(p: PassengerResult): string {
  const name = `${p.firstName} ${p.lastName}`
  const doc = p.documentType ? ` — ${p.documentType.name} ${p.documentNumber}` : ""
  return `${name}${doc}`
}

export function ManageReservationForm({
  reservation,
  trips,
  documentTypes,
  countries,
  reservationStatuses,
}: Props) {
  const router = useRouter()

  // Passenger state (initialized from server data)
  const [passengers, setPassengers] = useState<PassengerRecord[]>(reservation.passengers)
  const [passengerDisplayValue, setPassengerDisplayValue] = useState("")
  const [quickSheetOpen, setQuickSheetOpen] = useState(false)
  const [isLinking, startLinkTransition] = useTransition()
  const [removingId, setRemovingId] = useState<string | null>(null)

  // Edit reservation state
  const [editTripId, setEditTripId] = useState(reservation.trip.id)
  const [editSeatCount, setEditSeatCount] = useState(reservation.seatCount)
  const [isSaving, startSaveTransition] = useTransition()

  // Reservation status state (local, syncs to server via setStatus)
  const [statusName, setStatusName] = useState(reservation.reservationStatus.name)
  const [isChangingStatus, startStatusTransition] = useTransition()
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)

  const statusByName = new Map(reservationStatuses.map((s) => [s.name, s]))
  const pendienteStatus = statusByName.get("PENDIENTE")
  const confirmadaStatus = statusByName.get("CONFIRMADA")
  const canceladaStatus = statusByName.get("CANCELADA")

  const isPendiente = statusName === "PENDIENTE"
  const isConfirmada = statusName === "CONFIRMADA"
  const isCancelada = statusName === "CANCELADA"
  const isTripClosed = reservation.trip.status.name === "CERRADO"

  function changeStatus(target: ReservationStatus, successMsg: string) {
    startStatusTransition(async () => {
      try {
        await api.reservations.passengers.setStatus(reservation.id, {
          reservationStatusId: target.id,
        })
        setStatusName(target.name)
        toast.success(successMsg)
        router.refresh()
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : "Error al cambiar el estado"
        )
      }
    })
  }

  function handleSelectPassenger(p: PassengerResult | null) {
    if (!p) return
    startLinkTransition(async () => {
      try {
        const linked = await api.reservations.passengers.addPassenger(reservation.id, {
          mode: "link",
          passengerId: p.id,
        })
        setPassengers((prev) => [
          ...prev,
          {
            id: linked.id,
            firstName: linked.firstName,
            lastName: linked.lastName,
            documentType: linked.documentType,
            documentNumber: linked.documentNumber,
            country: linked.country,
            birthDate: linked.birthDate ? new Date(linked.birthDate) : null,
          },
        ])
        setPassengerDisplayValue("")
        router.refresh()
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Error al agregar el pasajero"
        toast.error(message)
      }
    })
  }

  function handleRemovePassenger(passengerId: string) {
    setRemovingId(passengerId)
    api.reservations.passengers
      .removePassenger(reservation.id, passengerId)
      .then(() => {
        setPassengers((prev) => prev.filter((p) => p.id !== passengerId))
        router.refresh()
      })
      .catch((err: unknown) => {
        const message = err instanceof ApiError ? err.message : "Error al eliminar el pasajero"
        toast.error(message)
      })
      .finally(() => setRemovingId(null))
  }

  function handleSaveReservation() {
    startSaveTransition(async () => {
      try {
        await api.reservations.passengers.update(reservation.id, {
          seatCount: editSeatCount,
          tripId: editTripId,
        })
        toast.success("Reserva actualizada")
        router.refresh()
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Error al actualizar la reserva"
        toast.error(message)
      }
    })
  }

  function handlePassengerCreated(passenger: PassengerResult) {
    setQuickSheetOpen(false)
    // The quick-passenger sheet already created+linked the passenger via the
    // nested addPassenger(mode: "create") endpoint, so just append locally.
    setPassengers((prev) => [...prev, passenger])
    setPassengerDisplayValue("")
    router.refresh()
  }

  const proveedorName =
    reservation.proveedor.companyName ??
    `${reservation.proveedor.firstName ?? ""} ${reservation.proveedor.lastName ?? ""}`.trim()

  const reservationChanged =
    editTripId !== reservation.trip.id || editSeatCount !== reservation.seatCount

  const isFull = passengers.length >= editSeatCount

  const cancelReservation = () => {
    if (!canceladaStatus) return
    setCancelDialogOpen(false)
    changeStatus(canceladaStatus, "Reserva cancelada")
  }

  return (
    <div className="px-4 lg:px-6">
      <div className="grid gap-6 lg:grid-cols-2">

        {/* ── Detalles de la reserva ── */}
        <div className="flex flex-col gap-4 rounded-xl border bg-card p-5">
          <p className="text-base font-semibold">Detalles de la reserva</p>

          {/* Proveedor info */}
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Proveedor</span>
            <span className="text-sm font-medium">{proveedorName}</span>
            {reservation.proveedor.phone && (
              <span className="text-xs text-muted-foreground">{reservation.proveedor.phone}</span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted-foreground">Estado</span>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge name={statusName} />
              {isPendiente && confirmadaStatus && (
                <Button
                  size="sm"
                  className="bg-green-600 text-white hover:bg-green-700"
                  disabled={!isFull || isChangingStatus || isTripClosed}
                  title={
                    isTripClosed
                      ? "El viaje está cerrado"
                      : !isFull
                        ? `Faltan ${Math.max(0, editSeatCount - passengers.length)} pasajero(s)`
                        : "Confirmar reserva"
                  }
                  onClick={() =>
                    changeStatus(confirmadaStatus, "Reserva confirmada")
                  }
                >
                  <IconCheck className="size-4 mr-1" />
                  Confirmar reserva
                </Button>
              )}
              {isConfirmada && pendienteStatus && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isChangingStatus || isTripClosed}
                  title={isTripClosed ? "El viaje está cerrado" : "Volver a pendiente"}
                  onClick={() =>
                    changeStatus(pendienteStatus, "Reserva marcada como pendiente")
                  }
                >
                  <IconRefresh className="size-4 mr-1" />
                  Marcar pendiente
                </Button>
              )}
              {!isCancelada && canceladaStatus && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  disabled={isChangingStatus || isTripClosed}
                  title={isTripClosed ? "El viaje está cerrado" : "Cancelar reserva"}
                  onClick={() => setCancelDialogOpen(true)}
                >
                  <IconX className="size-4 mr-1" />
                  Cancelar reserva
                </Button>
              )}
            </div>
            {isPendiente && !isFull && (
              <p className="text-xs text-muted-foreground">
                Asigná todos los pasajeros para poder confirmar la reserva.
              </p>
            )}
            {isTripClosed && (
              <p className="text-xs text-muted-foreground">
                El viaje está cerrado, no se puede cambiar el estado de la reserva.
              </p>
            )}
          </div>

          <Separator />

          {/* Editable fields */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="seatCount">Cantidad de asientos</Label>
              <Input
                id="seatCount"
                type="number"
                min={1}
                value={editSeatCount}
                onChange={(e) => setEditSeatCount(Number(e.target.value))}
                className="w-32"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="trip">Viaje</Label>
              <Select value={editTripId} onValueChange={setEditTripId}>
                <SelectTrigger id="trip" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {trips.map((trip) => (
                    <SelectItem key={trip.id} value={trip.id}>
                      {format(new Date(trip.departureAt), "dd MMM yyyy HH:mm", { locale: es })} —{" "}
                      {trip.route.origin} → {trip.route.destination}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {reservationChanged && (
              <Button
                size="sm"
                className="w-fit"
                onClick={handleSaveReservation}
                disabled={isSaving}
              >
                {isSaving ? "Guardando..." : "Guardar cambios"}
              </Button>
            )}
          </div>
        </div>

        {/* ── Pasajeros ── */}
        <div className="flex flex-col gap-4 rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold">
              Pasajeros{" "}
              <span className="text-sm font-normal text-muted-foreground">
                ({passengers.length}/{editSeatCount})
              </span>
            </p>
          </div>

          {/* Autocomplete para buscar y agregar pasajeros */}
          <div className="flex flex-col gap-1.5">
            <Label>Buscar pasajero</Label>
            <Autocomplete<PassengerResult>
              searchFn={(query) =>
                api.passengers.search(query).then((results) =>
                  results.map((r) => ({
                    id: r.id,
                    firstName: r.firstName,
                    lastName: r.lastName,
                    documentType: r.documentType,
                    documentNumber: r.documentNumber,
                    country: r.country,
                    birthDate: r.birthDate ? new Date(r.birthDate) : null,
                  }))
                )
              }
              displayFn={getPassengerDisplayValue}
              value={passengerDisplayValue}
              onSelect={handleSelectPassenger}
              placeholder="Buscar por nombre o documento..."
              disabled={isFull || isLinking}
              onAddNew={() => setQuickSheetOpen(true)}
              addNewLabel="Crear nuevo pasajero"
            />
            {isLinking && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <IconLoader className="size-3 animate-spin" />
                Agregando pasajero...
              </p>
            )}
            {isFull && (
              <p className="text-xs text-muted-foreground">
                Se alcanzó el límite de asientos para esta reserva
              </p>
            )}
          </div>

          {/* Passenger list */}
          {passengers.length === 0 ? (
            <p className="text-sm italic text-muted-foreground">Sin pasajeros ingresados</p>
          ) : (
            <div className="flex flex-col gap-2">
              {passengers.map((p) => (
                <div
                  key={p.id}
                  className="flex items-start justify-between gap-2 rounded-md border p-3"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-medium">
                      {p.firstName} {p.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {p.documentType?.name} {p.documentNumber}
                      {p.country ? ` · ${p.country.name}` : ""}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 text-destructive hover:text-destructive"
                    onClick={() => handleRemovePassenger(p.id)}
                    disabled={removingId === p.id}
                  >
                    {removingId === p.id ? (
                      <IconLoader className="size-4 animate-spin" />
                    ) : (
                      <IconTrash className="size-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Audit footer */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
        <span>
          Creado el{" "}
          {new Date(reservation.createdAt).toLocaleDateString("es-AR", {
            year: "numeric",
            month: "short",
            day: "2-digit",
          })}
          {reservation.createdBy ? ` por ${reservation.createdBy.name}` : ""}
        </span>
        <span>
          Última modificación:{" "}
          {new Date(reservation.updatedAt).toLocaleDateString("es-AR", {
            year: "numeric",
            month: "short",
            day: "2-digit",
          })}
          {reservation.updatedBy ? ` por ${reservation.updatedBy.name}` : ""}
        </span>
      </div>

      <QuickPassengerSheet
        open={quickSheetOpen}
        onOpenChange={setQuickSheetOpen}
        reservationId={reservation.id}
        documentTypes={documentTypes}
        countries={countries}
        onCreated={handlePassengerCreated}
      />

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar reserva?</AlertDialogTitle>
            <AlertDialogDescription>
              La reserva quedará marcada como CANCELADA y no se tendrá en
              cuenta para los asientos del viaje. Esta acción puede revertirse
              cambiando el estado de nuevo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isChangingStatus}>
              No, dejar como está
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={cancelReservation}
              disabled={isChangingStatus}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sí, cancelar reserva
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
