import { notFound } from "next/navigation";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { TarifasTable } from "./_components/tarifas-table";

export default async function ProveedorTarifasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [proveedor, tariffs, routes] = await Promise.all([
    prisma.proveedor.findUnique({
      where: { id },
      include: { proveedorType: { select: { id: true, name: true } } },
    }),
    prisma.proveedorTariff.findMany({
      where: { proveedorId: id },
      include: {
        route: {
          select: {
            id: true,
            origin: true,
            destination: true,
            branch: { select: { id: true, name: true } },
            directPriceAmount: true,
            incomingAgencyPriceAmount: true,
            outgoingCommissionAmount: true,
            minPrice: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.route.findMany({
      include: { branch: { select: { id: true, name: true } } },
      orderBy: [{ origin: "asc" }, { destination: "asc" }],
    }),
  ]);

  if (!proveedor) notFound();

  const displayName =
    proveedor.companyName ??
    `${proveedor.firstName ?? ""} ${proveedor.lastName ?? ""}`.trim() ??
    "Proveedor";

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <h1 className="text-xl font-semibold">Tarifas — {displayName}</h1>
          <p className="text-sm text-muted-foreground">
            Precios negociados por ruta. Si una columna queda vacía, se usa el
            precio estándar de la ruta.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/proveedores">
            <IconArrowLeft className="size-4" />
            Volver
          </Link>
        </Button>
      </div>
      <TarifasTable
        proveedorId={id}
        tariffs={tariffs.map((t) => ({
          id: t.id,
          isActive: t.isActive,
          notes: t.notes,
          directPriceAmount: t.directPriceAmount?.toString() ?? null,
          incomingAgencyPriceAmount:
            t.incomingAgencyPriceAmount?.toString() ?? null,
          outgoingCommissionAmount:
            t.outgoingCommissionAmount?.toString() ?? null,
          minPrice: t.minPrice?.toString() ?? null,
          route: {
            id: t.route.id,
            origin: t.route.origin,
            destination: t.route.destination,
            branchName: t.route.branch.name,
            directPriceAmount: t.route.directPriceAmount.toString(),
            incomingAgencyPriceAmount:
              t.route.incomingAgencyPriceAmount.toString(),
            outgoingCommissionAmount:
              t.route.outgoingCommissionAmount.toString(),
            minPrice: t.route.minPrice.toString(),
          },
        }))}
        routes={routes.map((r) => ({
          id: r.id,
          origin: r.origin,
          destination: r.destination,
          branchName: r.branch.name,
          directPriceAmount: r.directPriceAmount.toString(),
          incomingAgencyPriceAmount: r.incomingAgencyPriceAmount.toString(),
          outgoingCommissionAmount: r.outgoingCommissionAmount.toString(),
          minPrice: r.minPrice.toString(),
        }))}
      />
    </div>
  );
}
