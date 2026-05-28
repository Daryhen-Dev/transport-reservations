import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { toCsv, csvResponse, dateStamp, type CsvColumn } from "@/lib/api/csv";

type Row = {
  id: string;
  departureAt: Date;
  route: { origin: string; destination: string };
  branch: { name: string };
  status: { name: string };
  schedule: { time: string } | null;
  manifest: { code: string } | null;
  _count: {
    crew: number;
    passengerReservations: number;
    cargoReservations: number;
  };
  createdAt: Date;
};

const columns: CsvColumn<Row>[] = [
  { header: "ID", accessor: (r) => r.id },
  {
    header: "Fecha de salida",
    accessor: (r) => r.departureAt.toISOString(),
  },
  { header: "Origen", accessor: (r) => r.route.origin },
  { header: "Destino", accessor: (r) => r.route.destination },
  { header: "Horario", accessor: (r) => r.schedule?.time ?? "" },
  { header: "Sucursal", accessor: (r) => r.branch.name },
  { header: "Estado", accessor: (r) => r.status.name },
  { header: "Manifiesto", accessor: (r) => r.manifest?.code ?? "" },
  { header: "Tripulantes", accessor: (r) => r._count.crew },
  { header: "Reservas pasajeros", accessor: (r) => r._count.passengerReservations },
  { header: "Reservas encomiendas", accessor: (r) => r._count.cargoReservations },
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

  const rows = await prisma.trip.findMany({
    where: effectiveBranchId ? { branchId: effectiveBranchId } : undefined,
    select: {
      id: true,
      departureAt: true,
      route: { select: { origin: true, destination: true } },
      branch: { select: { name: true } },
      status: { select: { name: true } },
      schedule: { select: { time: true } },
      manifest: { select: { code: true } },
      _count: {
        select: {
          crew: true,
          passengerReservations: true,
          cargoReservations: true,
        },
      },
      createdAt: true,
    },
    orderBy: { departureAt: "desc" },
  });

  const csv = toCsv(rows, columns);
  return csvResponse(csv, `viajes_${dateStamp()}.csv`);
});
