"use client"

import { useState } from "react"
import { IconUserCheck, IconPackage } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { NuevaReservaForm } from "./nueva-reserva-form"
import { NuevaEncomiendaForm } from "./nueva-encomienda-form"
import type { TripSchedule, Route } from "@/lib/generated/prisma/client"

type TripScheduleWithRoute = TripSchedule & { route: Route }

type Props = {
  fecha: string | null
  schedules: TripScheduleWithRoute[]
  proveedorTypes: { id: string; name: string }[]
  documentTypes: { id: string; name: string }[]
  slug?: string
  branchId: string
  categorias: { id: string; name: string }[]
  branches: { id: string; name: string }[]
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
}: Props) {
  const [tipo, setTipo] = useState<"pasajero" | "encomienda">("pasajero")

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 px-4 lg:px-6">
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
      </div>

      {tipo === "pasajero" ? (
        <NuevaReservaForm
          fecha={fecha}
          schedules={schedules}
          proveedorTypes={proveedorTypes}
          documentTypes={documentTypes}
          slug={slug}
          branchId={branchId}
        />
      ) : (
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
    </div>
  )
}
