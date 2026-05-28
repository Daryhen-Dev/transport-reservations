import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";
import { toCsv, csvResponse, dateStamp, type CsvColumn } from "@/lib/api/csv";

type Row = {
  firstName: string;
  lastName: string;
  documentType: { name: string };
  documentNumber: string;
  birthDate: Date | null;
  phone: string | null;
  country: { name: string; nationality: string };
  createdAt: Date;
};

const columns: CsvColumn<Row>[] = [
  { header: "Nombre", accessor: (r) => r.firstName },
  { header: "Apellido", accessor: (r) => r.lastName },
  { header: "Tipo de documento", accessor: (r) => r.documentType.name },
  { header: "Número de documento", accessor: (r) => r.documentNumber },
  {
    header: "Fecha de nacimiento",
    accessor: (r) => (r.birthDate ? r.birthDate.toISOString().slice(0, 10) : ""),
  },
  { header: "Teléfono", accessor: (r) => r.phone ?? "" },
  { header: "País", accessor: (r) => r.country.name },
  { header: "Nacionalidad", accessor: (r) => r.country.nationality },
  {
    header: "Creado",
    accessor: (r) => r.createdAt.toISOString().slice(0, 10),
  },
];

export const GET = withAuth(async () => {
  const rows = await prisma.passenger.findMany({
    select: {
      firstName: true,
      lastName: true,
      documentType: { select: { name: true } },
      documentNumber: true,
      birthDate: true,
      phone: true,
      country: { select: { name: true, nationality: true } },
      createdAt: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const csv = toCsv(rows, columns);
  return csvResponse(csv, `pasajeros_${dateStamp()}.csv`);
});
