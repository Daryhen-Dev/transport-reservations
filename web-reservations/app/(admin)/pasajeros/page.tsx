import { prisma } from "@/lib/db"
import { PassengersTable } from "./_components/passengers-table"

export default async function PasajerosPage() {
  const [passengers, documentTypes, countries] = await Promise.all([
    prisma.passenger.findMany({
      include: {
        documentType: { select: { id: true, name: true } },
        country: { select: { id: true, name: true } },
        _count: { select: { reservations: true } },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.documentType.findMany({ orderBy: { name: "asc" } }),
    prisma.country.findMany({ orderBy: { name: "asc" } }),
  ])

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <PassengersTable
        data={passengers}
        documentTypes={documentTypes}
        countries={countries}
      />
    </div>
  )
}
