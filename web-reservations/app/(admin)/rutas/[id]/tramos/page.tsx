import { notFound } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { TramosTable } from "./_components/tramos-table";

export default async function RouteTramosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [route, segments, operators] = await Promise.all([
    prisma.route.findUnique({
      where: { id },
      include: { branch: { select: { id: true, name: true } } },
    }),
    prisma.routeSegment.findMany({
      where: { routeId: id },
      include: {
        operatorProveedor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
            proveedorType: { select: { name: true } },
          },
        },
      },
      orderBy: { position: "asc" },
    }),
    prisma.proveedor.findMany({
      where: { proveedorType: { name: "AGENCIA" } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        companyName: true,
        proveedorType: { select: { name: true } },
      },
      orderBy: [{ companyName: "asc" }, { firstName: "asc" }],
    }),
  ]);

  if (!route) notFound();

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <h1 className="text-xl font-semibold">
            Tramos — {route.origin} → {route.destination}
          </h1>
          <p className="text-sm text-muted-foreground">
            Configurá los tramos de la ruta. Marcalos como externos cuando un
            operador distinto cubra el recorrido.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/rutas">
            <IconArrowLeft className="size-4" />
            Volver a rutas
          </Link>
        </Button>
      </div>
      <TramosTable
        routeId={id}
        segments={segments.map((s) => ({
          id: s.id,
          position: s.position,
          origin: s.origin,
          destination: s.destination,
          isExternal: s.isExternal,
          operatorProveedorId: s.operatorProveedorId,
          externalCostAmount: s.externalCostAmount?.toString() ?? null,
          notes: s.notes,
          operatorProveedor: s.operatorProveedor
            ? {
                id: s.operatorProveedor.id,
                firstName: s.operatorProveedor.firstName,
                lastName: s.operatorProveedor.lastName,
                companyName: s.operatorProveedor.companyName,
                proveedorTypeName: s.operatorProveedor.proveedorType.name,
              }
            : null,
        }))}
        operators={operators.map((o) => ({
          id: o.id,
          firstName: o.firstName,
          lastName: o.lastName,
          companyName: o.companyName,
          proveedorTypeName: o.proveedorType.name,
        }))}
      />
    </div>
  );
}
