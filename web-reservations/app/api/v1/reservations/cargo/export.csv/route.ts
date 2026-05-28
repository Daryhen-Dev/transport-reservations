import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { toCsv, csvResponse, dateStamp, type CsvColumn } from "@/lib/api/csv";

type Row = {
  id: string;
  description: string | null;
  weightKg: number;
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
  };
  categoria: { name: string } | null;
  destinatario: {
    firstName: string;
    lastName: string;
    phone: string | null;
  } | null;
  destinationBranch: { name: string } | null;
  externalDestination: string | null;
  reservationStatus: { name: string };
  cargoStatus: { name: string } | null;
  createdAt: Date;
};

const columns: CsvColumn<Row>[] = [
  { header: "Código", accessor: (r) => `EN-${r.id.slice(-8).toUpperCase()}` },
  {
    header: "Fecha viaje",
    accessor: (r) => r.trip.departureAt.toISOString(),
  },
  { header: "Origen", accessor: (r) => r.trip.route.origin },
  { header: "Destino viaje", accessor: (r) => r.trip.route.destination },
  { header: "Sucursal", accessor: (r) => r.trip.branch.name },
  {
    header: "Remitente",
    accessor: (r) =>
      r.proveedor.companyName ??
      `${r.proveedor.firstName ?? ""} ${r.proveedor.lastName ?? ""}`.trim(),
  },
  { header: "Teléfono remitente", accessor: (r) => r.proveedor.phone ?? "" },
  {
    header: "Destinatario",
    accessor: (r) =>
      r.destinatario
        ? `${r.destinatario.firstName} ${r.destinatario.lastName}`
        : "",
  },
  {
    header: "Teléfono destinatario",
    accessor: (r) => r.destinatario?.phone ?? "",
  },
  {
    header: "Destino entrega",
    accessor: (r) =>
      r.destinationBranch?.name ?? r.externalDestination ?? "",
  },
  { header: "Descripción", accessor: (r) => r.description ?? "" },
  { header: "Peso (kg)", accessor: (r) => r.weightKg },
  { header: "Categoría", accessor: (r) => r.categoria?.name ?? "" },
  { header: "Estado reserva", accessor: (r) => r.reservationStatus.name },
  { header: "Estado encomienda", accessor: (r) => r.cargoStatus?.name ?? "" },
  {
    header: "Creado",
    accessor: (r) => r.createdAt.toISOString().slice(0, 10),
  },
];

export const GET = withAuth(async (req, { auth }) => {
  const url = new URL(req.url);
  const branchIdParam = url.searchParams.get("branchId") ?? undefined;
  const effectiveBranchId =
    auth.role === "SUCURSAL_USER" ? auth.branchId ?? undefined : branchIdParam;

  const rows = await prisma.cargoReservation.findMany({
    where: effectiveBranchId ? { trip: { branchId: effectiveBranchId } } : undefined,
    select: {
      id: true,
      description: true,
      weightKg: true,
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
        },
      },
      categoria: { select: { name: true } },
      destinatario: {
        select: { firstName: true, lastName: true, phone: true },
      },
      destinationBranch: { select: { name: true } },
      externalDestination: true,
      reservationStatus: { select: { name: true } },
      cargoStatus: { select: { name: true } },
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const csv = toCsv(rows, columns);
  return csvResponse(csv, `encomiendas_${dateStamp()}.csv`);
});
