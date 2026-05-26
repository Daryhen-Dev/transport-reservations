"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconPlus } from "@tabler/icons-react"
import { createProveedor, updateProveedor } from "@/app/actions/proveedor"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
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

const personaSchema = z.object({
  proveedorTypeId: z.string().min(1, "Tipo de proveedor requerido"),
  firstName: z.string().min(1, "Nombre requerido"),
  lastName: z.string().min(1, "Apellido requerido"),
  documentTypeId: z.string().min(1, "Tipo de documento requerido"),
  documentNumber: z.string().min(1, "Número de documento requerido"),
  companyName: z.string().optional(),
  phone: z.string().optional(),
})

const empresaSchema = z.object({
  proveedorTypeId: z.string().min(1, "Tipo de proveedor requerido"),
  companyName: z.string().min(1, "Nombre de empresa requerido"),
  documentTypeId: z.string().min(1, "Tipo de documento requerido"),
  documentNumber: z.string().min(1, "Número de documento requerido"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
})

const baseSchema = z.object({
  proveedorTypeId: z.string().min(1, "Tipo de proveedor requerido"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  companyName: z.string().optional(),
  documentTypeId: z.string().optional(),
  documentNumber: z.string().optional(),
  phone: z.string().optional(),
})

type FormValues = z.infer<typeof baseSchema>

type ProveedorType = { id: string; name: string }
type DocumentType = { id: string; name: string }

type Proveedor = {
  id: string
  proveedorTypeId: string
  proveedorType: { id: string; name: string }
  firstName: string | null
  lastName: string | null
  companyName: string | null
  documentTypeId: string | null
  documentType: { id: string; name: string } | null
  documentNumber: string | null
  phone: string | null
}

type Props = {
  currentSlug: string
  proveedorTypes: ProveedorType[]
  documentTypes: DocumentType[]
  proveedor?: Proveedor
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: boolean
}

function getSchemaForType(typeName: string | undefined) {
  if (!typeName) return baseSchema
  if (typeName.toLowerCase().includes("persona")) return personaSchema
  return empresaSchema
}

export function ProveedorSheet({
  currentSlug,
  proveedorTypes,
  documentTypes,
  proveedor,
  open,
  onOpenChange,
  trigger = true,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined && onOpenChange !== undefined
  const isOpen = isControlled ? open : internalOpen
  const setOpen = isControlled ? onOpenChange : setInternalOpen

  const router = useRouter()

  const defaultTypeId = proveedor?.proveedorTypeId ?? ""
  const [selectedTypeId, setSelectedTypeId] = useState<string>(defaultTypeId)

  const selectedType = proveedorTypes.find((ct) => ct.id === selectedTypeId)
  const isPersona = selectedType?.name.toLowerCase().includes("persona") ?? false
  const isEmpresa = selectedType !== undefined && !isPersona

  const schema = getSchemaForType(selectedType?.name)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      proveedorTypeId: defaultTypeId,
      firstName: proveedor?.firstName ?? "",
      lastName: proveedor?.lastName ?? "",
      companyName: proveedor?.companyName ?? "",
      documentTypeId: proveedor?.documentTypeId ?? "",
      documentNumber: proveedor?.documentNumber ?? "",
      phone: proveedor?.phone ?? "",
    },
  })

  const documentTypeIdValue = watch("documentTypeId")

  useEffect(() => {
    if (isOpen) {
      const typeId = proveedor?.proveedorTypeId ?? ""
      setSelectedTypeId(typeId)
      reset({
        proveedorTypeId: typeId,
        firstName: proveedor?.firstName ?? "",
        lastName: proveedor?.lastName ?? "",
        companyName: proveedor?.companyName ?? "",
        documentTypeId: proveedor?.documentTypeId ?? "",
        documentNumber: proveedor?.documentNumber ?? "",
        phone: proveedor?.phone ?? "",
      })
    }
  }, [isOpen, proveedor, reset])

  async function onSubmit(data: FormValues) {
    const payload = { ...data, currentSlug }
    const result = proveedor
      ? await updateProveedor(proveedor.id, payload)
      : await createProveedor(payload)

    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success(proveedor ? "Proveedor actualizado" : "Proveedor creado exitosamente")
    reset()
    setOpen(false)
    router.refresh()
  }

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      {trigger && (
        <SheetTrigger asChild>
          <Button size="sm">
            <IconPlus className="size-4" />
            Nuevo proveedor
          </Button>
        </SheetTrigger>
      )}
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{proveedor ? "Editar proveedor" : "Nuevo proveedor"}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 px-4">

          {/* ProveedorType — read-only in edit mode */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="proveedorTypeId">Tipo de proveedor</Label>
            {proveedor ? (
              <p className="text-sm text-muted-foreground">{proveedor.proveedorType.name}</p>
            ) : (
              <>
                <Select
                  value={selectedTypeId}
                  onValueChange={(val) => {
                    setSelectedTypeId(val)
                    setValue("proveedorTypeId", val)
                  }}
                >
                  <SelectTrigger id="proveedorTypeId" className="w-full">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {proveedorTypes.map((ct) => (
                      <SelectItem key={ct.id} value={ct.id}>
                        {ct.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.proveedorTypeId && (
                  <p className="text-sm text-destructive">{errors.proveedorTypeId.message}</p>
                )}
              </>
            )}
          </div>

          {/* No type selected hint */}
          {!selectedTypeId && !proveedor && (
            <p className="text-sm text-muted-foreground">
              Seleccioná un tipo de proveedor para continuar.
            </p>
          )}

          {/* PERSONA fields */}
          {isPersona && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="firstName">Nombre</Label>
                <Input id="firstName" placeholder="Juan" {...register("firstName")} />
                {errors.firstName && (
                  <p className="text-sm text-destructive">{errors.firstName.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lastName">Apellido</Label>
                <Input id="lastName" placeholder="Pérez" {...register("lastName")} />
                {errors.lastName && (
                  <p className="text-sm text-destructive">{errors.lastName.message}</p>
                )}
              </div>
            </>
          )}

          {/* EMPRESA fields */}
          {isEmpresa && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="companyName">Nombre de empresa</Label>
              <Input id="companyName" placeholder="Empresa S.A." {...register("companyName")} />
              {errors.companyName && (
                <p className="text-sm text-destructive">{errors.companyName.message}</p>
              )}
            </div>
          )}

          {/* Document fields — shared when type is selected */}
          {(isPersona || isEmpresa) && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="documentTypeId">Tipo de documento</Label>
                <Select
                  value={documentTypeIdValue ?? ""}
                  onValueChange={(val) => setValue("documentTypeId", val)}
                >
                  <SelectTrigger id="documentTypeId" className="w-full">
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
                {errors.documentTypeId && (
                  <p className="text-sm text-destructive">{errors.documentTypeId.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="documentNumber">Número de documento</Label>
                <Input id="documentNumber" placeholder="V-12345678" {...register("documentNumber")} />
                {errors.documentNumber && (
                  <p className="text-sm text-destructive">{errors.documentNumber.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" type="tel" placeholder="+54 9 11 1234 5678" {...register("phone")} />
              </div>
            </>
          )}

          {(isPersona || isEmpresa) && (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? proveedor ? "Guardando..." : "Creando..."
                : proveedor ? "Guardar cambios" : "Crear proveedor"}
            </Button>
          )}
        </form>
      </SheetContent>
    </Sheet>
  )
}
