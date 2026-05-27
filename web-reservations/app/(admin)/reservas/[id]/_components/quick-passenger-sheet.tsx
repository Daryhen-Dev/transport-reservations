"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { api, ApiError } from "@/lib/api/client"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type DocumentType = { id: string; name: string }
type Country = { id: string; name: string }

type PassengerResult = {
  id: string
  firstName: string
  lastName: string
  documentType: { id: string; name: string } | null
  documentNumber: string
  country: { id: string; name: string } | null
  birthDate: Date | null
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  reservationId: string
  documentTypes: DocumentType[]
  countries: Country[]
  onCreated: (passenger: PassengerResult) => void
}

export function QuickPassengerSheet({
  open,
  onOpenChange,
  reservationId,
  documentTypes,
  countries,
  onCreated,
}: Props) {
  const [isPending, startTransition] = useTransition()

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [documentTypeId, setDocumentTypeId] = useState("")
  const [documentNumber, setDocumentNumber] = useState("")
  const [countryId, setCountryId] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [phone, setPhone] = useState("")

  function resetFields() {
    setFirstName("")
    setLastName("")
    setDocumentTypeId("")
    setDocumentNumber("")
    setCountryId("")
    setBirthDate("")
    setPhone("")
  }

  function handleOpenChange(value: boolean) {
    if (!value) resetFields()
    onOpenChange(value)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    startTransition(async () => {
      try {
        const passenger = await api.reservations.passengers.addPassenger(reservationId, {
          mode: "create",
          passenger: {
            firstName,
            lastName,
            documentTypeId,
            documentNumber,
            countryId,
            birthDate: birthDate || undefined,
            phone: phone || undefined,
          },
        })
        toast.success("Pasajero creado exitosamente")
        onCreated({
          id: passenger.id,
          firstName: passenger.firstName,
          lastName: passenger.lastName,
          documentType: passenger.documentType,
          documentNumber: passenger.documentNumber,
          country: passenger.country,
          birthDate: passenger.birthDate ? new Date(passenger.birthDate) : null,
        })
        resetFields()
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Error al crear el pasajero"
        toast.error(message)
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Nuevo Pasajero</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="qp-firstName">Nombre</Label>
            <Input
              id="qp-firstName"
              placeholder="Juan"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="qp-lastName">Apellido</Label>
            <Input
              id="qp-lastName"
              placeholder="Pérez"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="qp-documentTypeId">Tipo de documento</Label>
            <Select value={documentTypeId} onValueChange={setDocumentTypeId} required>
              <SelectTrigger id="qp-documentTypeId" className="w-full">
                <SelectValue placeholder="Seleccionar tipo de documento" />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map((dt) => (
                  <SelectItem key={dt.id} value={dt.id}>
                    {dt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="qp-documentNumber">Número de documento</Label>
            <Input
              id="qp-documentNumber"
              placeholder="V-12345678"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="qp-countryId">País</Label>
            <Select value={countryId} onValueChange={setCountryId} required>
              <SelectTrigger id="qp-countryId" className="w-full">
                <SelectValue placeholder="Seleccionar país" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="qp-birthDate">Fecha de nacimiento (opcional)</Label>
            <Input
              id="qp-birthDate"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="qp-phone">Teléfono (opcional)</Label>
            <Input
              id="qp-phone"
              type="tel"
              placeholder="+54 9 11 1234 5678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={isPending}>
            {isPending ? "Creando..." : "Crear pasajero"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
