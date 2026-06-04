import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { toCsv, csvResponse, dateStamp, type CsvColumn } from "@/lib/api/csv";

type Row = {
  id: string;
  seatCount: number;
  priceType: string;
  priceAmount: { toString(): string };
  commissionAmount: { toString(): string } | null;
  transferredToAgency: {
    firstName: string | null;
    lastName: string | null;
    companyName: string | null;
  } | null;
  transferAmountToAgency: { toString(): string } | null;
  transferCommissionAmount: { toString(): string } | null;
  trip: {
    departureAt: Date;
    route: { origin: string; destination: string };
    branch: { name: string };
    status: { name: string };
  };
  proveedor: {
    firstName: string | null;
    lastName: string | null;
    companyName: string | null;
    phone: string | null;
    documentNumber: string | null;
    documentType: { name: string } | null;
    proveedorType: { name: string };
  };
  reservationStatus: { name: string };
  _count: { passengers: number };
  createdAt: Date;
};

function agencyName(a: Row["transferredToAgency"]): string {
  if (!a) return "";
  return a.companyName ?? `${a.firstName ?? ""} ${a.lastName ?? ""}`.trim();
}

const columns: CsvColumn<Row>[] = [
  { header: "Código", accessor: (r) => `PR-${r.id.slice(-8).toUpperCase()}` },
  {
    header: "Fecha viaje",
    accessor: (r) => r.trip.departureAt.toISOString(),
  },
  { header: "Origen", accessor: (r) => r.trip.route.origin },
  { header: "Destino", accessor: (r) => r.trip.route.destination },
  { header: "Sucursal", accessor: (r) => r.trip.branch.name },
  { header: "Estado viaje", accessor: (r) => r.trip.status.name },
  { header: "Tipo proveedor", accessor: (r) => r.proveedor.proveedorType.name },
  {
    header: "Proveedor",
    accessor: (r) =>
      r.proveedor.companyName ??
      `${r.proveedor.firstName ?? ""} ${r.proveedor.lastName ?? ""}`.trim(),
  },
  {
    header: "Documento proveedor",
    accessor: (r) =>
      r.proveedor.documentNumber
        ? `${r.proveedor.documentType?.name ?? ""} ${r.proveedor.documentNumber}`.trim()
        : "",
  },
  { header: "Teléfono", accessor: (r) => r.proveedor.phone ?? "" },
  { header: "Asientos", accessor: (r) => r.seatCount },
  { header: "Pasajeros asignados", accessor: (r) => r._count.passengers },
  { header: "Tipo precio", accessor: (r) => r.priceType },
  {
    header: "Precio cobrado",
    accessor: (r) => Number(r.priceAmount.toString()).toFixed(2),
  },
  {
    header: "Comisión",
    accessor: (r) =>
      r.commissionAmount
        ? Number(r.commissionAmount.toString()).toFixed(2)
        : "",
  },
  { header: "Estado reserva", accessor: (r) => r.reservationStatus.name },
  { header: "Transferida a agencia", accessor: (r) => agencyName(r.transferredToAgency) },
  {
    header: "Enviado a agencia",
    accessor: (r) =>
      r.transferAmountToAgency
        ? Number(r.transferAmountToAgency.toString()).toFixed(2)
        : "",
  },
  {
    header: "Comisión transferencia",
    accessor: (r) =>
      r.transferCommissionAmount
        ? Number(r.transferCommissionAmount.toString()).toFixed(2)
        : "",
  },
  {
    header: "Creado",
    accessor: (r) => r.createdAt.toISOString().slice(0, 10),
  },
];

export const GET = withAuth(async (req, { auth }) => {
  const url = new URL(req.url);
  const branchIdParam = url.searchParams.get("branchId") ?? undefined;
  const fromParam = url.searchParams.get("from") ?? undefined;
  const toParam = url.searchParams.get("to") ?? undefined;
  const effectiveBranchId =
    auth.role === "SUCURSAL_USER" ? auth.branchId ?? undefined : branchIdParam;

  const from = fromParam ? new Date(fromParam) : undefined;
  const to = toParam ? new Date(toParam) : undefined;
  const tripFilter: Record<string, unknown> = {};
  if (effectiveBranchId) tripFilter.branchId = effectiveBranchId;
  if (from || to) {
    tripFilter.departureAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  const rows = await prisma.passengerReservation.findMany({
    where: Object.keys(tripFilter).length > 0 ? { trip: tripFilter } : undefined,
    select: {
      id: true,
      seatCount: true,
      priceType: true,
      priceAmount: true,
      commissionAmount: true,
      transferAmountToAgency: true,
      transferCommissionAmount: true,
      transferredToAgency: {
        select: {
          firstName: true,
          lastName: true,
          companyName: true,
        },
      },
      trip: {
        select: {
          departureAt: true,
          route: { select: { origin: true, destination: true } },
          branch: { select: { name: true } },
          status: { select: { name: true } },
        },
      },
      proveedor: {
        select: {
          firstName: true,
          lastName: true,
          companyName: true,
          phone: true,
          documentNumber: true,
          documentType: { select: { name: true } },
          proveedorType: { select: { name: true } },
        },
      },
      reservationStatus: { select: { name: true } },
      _count: { select: { passengers: true } },
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const csv = toCsv(rows, columns);
  return csvResponse(csv, `reservas_pasajeros_${dateStamp()}.csv`);
});
