"use client"

import { useState } from "react"
import { IconUserCheck, IconPackage, IconArrowsExchange } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { NuevaReservaForm, type TripScheduleWithRoute } from "./nueva-reserva-form"
import { NuevaEncomiendaForm } from "./nueva-encomienda-form"
import { TransferidaDirectaForm } from "./transferida-directa-form"

type Tipo = "pasajero" | "encomienda" | "transferida"

type Props = {
  fecha: string | null
  schedules: TripScheduleWithRoute[]
  proveedorTypes: { id: string; name: string }[]
  documentTypes: { id: string; name: string }[]
  slug?: string
  branchId: string
  categorias: { id: string; name: string }[]
  branches: { id: string; name: string }[]
  countries: { id: string; name: string }[]
}

export function NuevaReservaSelector({
  fecha,
  schedules,
  proveedorTypes,
  documentTypes,
  slug,
  branchId,
  categorias,
  branches,
  countries,
}: Props) {
  const [tipo, setTipo] = useState<Tipo>("pasajero")

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2 px-4 lg:px-6">
        <Button
          type="button"
          variant={tipo === "pasajero" ? "default" : "outline"}
          onClick={() => setTipo("pasajero")}
        >
          <IconUserCheck className="size-4" /> Pasajero
        </Button>
        <Button
          type="button"
          variant={tipo === "encomienda" ? "default" : "outline"}
          onClick={() => setTipo("encomienda")}
        >
          <IconPackage className="size-4" /> Encomienda
        </Button>
        <Button
          type="button"
          variant={tipo === "transferida" ? "default" : "outline"}
          onClick={() => setTipo("transferida")}
        >
          <IconArrowsExchange className="size-4" /> Pasajero transferido
        </Button>
      </div>

      {tipo === "pasajero" && (
        <NuevaReservaForm
          fecha={fecha}
          schedules={schedules}
          proveedorTypes={proveedorTypes}
          documentTypes={documentTypes}
          slug={slug}
          branchId={branchId}
        />
      )}
      {tipo === "encomienda" && (
        <NuevaEncomiendaForm
          fecha={fecha}
          slug={slug}
          branchId={branchId}
          schedules={schedules}
          documentTypes={documentTypes}
          proveedorTypes={proveedorTypes}
          categorias={categorias}
          branches={branches}
        />
      )}
      {tipo === "transferida" && (
        <TransferidaDirectaForm
          fecha={fecha}
          schedules={schedules}
          proveedorTypes={proveedorTypes}
          documentTypes={documentTypes}
          countries={countries}
          slug={slug}
          branchId={branchId}
        />
      )}
    </div>
  )
}
