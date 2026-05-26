"use client"

import { useState, useTransition } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { IconTrash, IconLoader } from "@tabler/icons-react"
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
import { Autocomplete } from "@/components/ui/autocomplete"
import {
  linkPassengerToReservation,
  removePassengerFromReservation,
  updatePassengerReservation,
} from "@/app/actions/passenger-reservation"
import { searchPassengersAction } from "@/app/actions/search"
import { QuickPassengerSheet } from "./quick-passenger-sheet"

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
  }
  trips: Array<{
    id: string
    departureAt: Date
    route: { origin: string; destination: string }
    branch: { name: string }
  }>
  documentTypes: Array<{ id: string; name: string }>
  countries: Array<{ id: string; name: string }>
  slug: string
}

function getPassengerDisplayValue(p: PassengerResult): string {
  const name = `${p.firstName} ${p.lastName}`
  const doc = p.documentType ? ` — ${p.documentType.name} ${p.documentNumber}` : ""
  return `${name}${doc}`
}

export function ManageReservationForm({ reservation, trips, documentTypes, countries, slug }: Props) {
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

  function handleSelectPassenger(p: PassengerResult | null) {
    if (!p) return
    startLinkTransition(async () => {
      const result = await linkPassengerToReservation({
        reservationId: reservation.id,
        passengerId: p.id,
        currentSlug: slug,
      })
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      setPassengers((prev) => [...prev, result.passenger as PassengerRecord])
      setPassengerDisplayValue("")
      router.refresh()
    })
  }

  function handleRemovePassenger(passengerId: string) {
    setRemovingId(passengerId)
    removePassengerFromReservation(passengerId, reservation.id, slug).then((result) => {
      setRemovingId(null)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setPassengers((prev) => prev.filter((p) => p.id !== passengerId))
      router.refresh()
    })
  }

  function handleSaveReservation() {
    startSaveTransition(async () => {
      const result = await updatePassengerReservation({
        id: reservation.id,
        seatCount: editSeatCount,
        tripId: editTripId,
        currentSlug: slug,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Reserva actualizada")
      router.refresh()
    })
  }

  function handlePassengerCreated(passenger: PassengerResult) {
    setQuickSheetOpen(false)
    startLinkTransition(async () => {
      const result = await linkPassengerToReservation({
        reservationId: reservation.id,
        passengerId: passenger.id,
        currentSlug: slug,
      })
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      setPassengers((prev) => [...prev, result.passenger as PassengerRecord])
      setPassengerDisplayValue("")
      router.refresh()
    })
  }

  const proveedorName =
    reservation.proveedor.companyName ??
    `${reservation.proveedor.firstName ?? ""} ${reservation.proveedor.lastName ?? ""}`.trim()

  const reservationChanged =
    editTripId !== reservation.trip.id || editSeatCount !== reservation.seatCount

  const isFull = passengers.length >= editSeatCount

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

          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Estado</span>
            <span className="text-sm font-medium">{reservation.reservationStatus.name}</span>
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
              searchFn={(query) => searchPassengersAction(query) as Promise<PassengerResult[]>}
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

      <QuickPassengerSheet
        open={quickSheetOpen}
        onOpenChange={setQuickSheetOpen}
        documentTypes={documentTypes}
        countries={countries}
        currentSlug={slug}
        onCreated={handlePassengerCreated}
      />
    </div>
  )
}
