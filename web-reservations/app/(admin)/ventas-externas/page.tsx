import { requireActiveBranch } from "@/lib/branch-context";
import { prisma } from "@/lib/db";
import { ExternalSalesTable } from "./_components/external-sales-table";

export default async function VentasExternasPage() {
  const branch = await requireActiveBranch();
  const branchId = branch.id;

  const [sales, agencies, reservationStatuses] = await Promise.all([
    prisma.externalSale.findMany({
      where: { branchId },
      include: {
        branch: { select: { id: true, name: true, slug: true } },
        operatorAgency: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
            proveedorType: { select: { id: true, name: true } },
          },
        },
        reservationStatus: { select: { id: true, name: true } },
      },
      orderBy: { departureAt: "desc" },
    }),
    prisma.proveedor.findMany({
      where: { proveedorType: { name: "AGENCIA" } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        companyName: true,
      },
      orderBy: [{ companyName: "asc" }, { firstName: "asc" }],
    }),
    prisma.reservationStatus.findMany({ orderBy: { name: "asc" } }),
  ]);

  // Serializar Decimals + Date a strings antes de pasar a Client Component.
  const serialized = sales.map((s) => ({
    id: s.id,
    branchId: s.branchId,
    branch: s.branch,
    operatorAgencyId: s.operatorAgencyId,
    operatorAgency: s.operatorAgency,
    buyerName: s.buyerName,
    buyerDocument: s.buyerDocument,
    buyerPhone: s.buyerPhone,
    departureAt: s.departureAt.toISOString(),
    origin: s.origin,
    destination: s.destination,
    passengerCount: s.passengerCount,
    priceCharged: s.priceCharged.toString(),
    costPaidToOperator: s.costPaidToOperator.toString(),
    reservationStatus: s.reservationStatus,
    notes: s.notes,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }));

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <h1 className="text-2xl font-semibold">Ventas externas</h1>
        <p className="text-sm text-muted-foreground">
          Boletos vendidos a clientes pero operados por otra agencia. No ocupan
          asientos de nuestros viajes.
        </p>
      </div>
      <ExternalSalesTable
        branchId={branchId}
        data={serialized}
        agencies={agencies}
        reservationStatuses={reservationStatuses}
      />
    </div>
  );
}
