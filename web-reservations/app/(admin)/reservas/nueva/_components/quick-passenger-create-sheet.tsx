"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { api, ApiError, type Passenger } from "@/lib/api/client"
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

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentTypes: DocumentType[]
  countries: Country[]
  onCreated: (passenger: Passenger) => void
}

export function QuickPassengerCreateSheet({
  open,
  onOpenChange,
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
        const passenger = await api.passengers.create({
          firstName,
          lastName,
          documentTypeId,
          documentNumber,
          countryId,
          birthDate: birthDate || "",
          phone: phone || "",
        })
        toast.success("Pasajero creado exitosamente")
        onCreated(passenger)
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
            <Label htmlFor="qpc-firstName">Nombre</Label>
            <Input
              id="qpc-firstName"
              placeholder="Juan"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="qpc-lastName">Apellido</Label>
            <Input
              id="qpc-lastName"
              placeholder="Pérez"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="qpc-documentTypeId">Tipo de documento</Label>
            <Select value={documentTypeId} onValueChange={setDocumentTypeId} required>
              <SelectTrigger id="qpc-documentTypeId" className="w-full">
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
            <Label htmlFor="qpc-documentNumber">Número de documento</Label>
            <Input
              id="qpc-documentNumber"
              placeholder="V-12345678"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="qpc-countryId">País</Label>
            <Select value={countryId} onValueChange={setCountryId} required>
              <SelectTrigger id="qpc-countryId" className="w-full">
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
            <Label htmlFor="qpc-birthDate">Fecha de nacimiento (opcional)</Label>
            <Input
              id="qpc-birthDate"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="qpc-phone">Teléfono (opcional)</Label>
            <Input
              id="qpc-phone"
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
