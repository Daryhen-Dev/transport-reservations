"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { createProveedor } from "@/app/actions/proveedor"
import type { ProveedorWithRelations } from "@/app/actions/proveedor"
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

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  proveedorTypeId: string | null
  proveedorTypeName: string | null
  documentTypes: DocumentType[]
  currentSlug: string
  onCreated: (proveedor: ProveedorWithRelations) => void
}

export function QuickProveedorSheet({
  open,
  onOpenChange,
  proveedorTypeId,
  proveedorTypeName,
  documentTypes,
  currentSlug,
  onCreated,
}: Props) {
  const [isPending, startTransition] = useTransition()

  const isPersona = proveedorTypeName?.toLowerCase().includes("persona") ?? false
  const sheetTitle = `Nuevo Proveedor — ${isPersona ? "Persona" : "Empresa"}`

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [documentTypeId, setDocumentTypeId] = useState("")
  const [documentNumber, setDocumentNumber] = useState("")
  const [phone, setPhone] = useState("")

  function resetFields() {
    setFirstName("")
    setLastName("")
    setCompanyName("")
    setDocumentTypeId("")
    setDocumentNumber("")
    setPhone("")
  }

  function handleOpenChange(value: boolean) {
    if (!value) resetFields()
    onOpenChange(value)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!proveedorTypeId) return

    startTransition(async () => {
      const payload = isPersona
        ? { proveedorTypeId, firstName, lastName, documentTypeId, documentNumber, phone, currentSlug }
        : { proveedorTypeId, companyName, documentTypeId, documentNumber, phone, currentSlug }

      const result = await createProveedor(payload)

      if (result.error) {
        toast.error(result.error)
        return
      }

      if (result.proveedor) {
        toast.success("Proveedor creado exitosamente")
        onCreated(result.proveedor)
        resetFields()
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{sheetTitle}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4">
          {isPersona ? (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="qs-firstName">Nombre</Label>
                <Input
                  id="qs-firstName"
                  placeholder="Juan"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="qs-lastName">Apellido</Label>
                <Input
                  id="qs-lastName"
                  placeholder="Pérez"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="qs-companyName">Nombre empresa</Label>
              <Input
                id="qs-companyName"
                placeholder="Empresa S.A."
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="qs-documentTypeId">Tipo de documento</Label>
            <Select value={documentTypeId} onValueChange={setDocumentTypeId} required>
              <SelectTrigger id="qs-documentTypeId" className="w-full">
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
            <Label htmlFor="qs-documentNumber">Número de documento</Label>
            <Input
              id="qs-documentNumber"
              placeholder="V-12345678"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="qs-phone">Teléfono</Label>
            <Input
              id="qs-phone"
              type="tel"
              placeholder="+54 9 11 1234 5678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={isPending}>
            {isPending ? "Creando..." : "Crear proveedor"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
