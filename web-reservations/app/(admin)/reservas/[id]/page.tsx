import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { getTrips } from "@/lib/services/trip.service"
import { serializePassengerReservation } from "@/lib/serialize"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { IconArrowLeft, IconReceipt } from "@tabler/icons-react"
import { ManageReservationForm } from "./_components/manage-reservation-form"

export default async function ManageReservationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [reservation, documentTypes, countries, trips, reservationStatuses] =
    await Promise.all([
      prisma.passengerReservation.findUnique({
        where: { id },
        include: {
          trip: {
            include: {
              route: { select: { id: true, origin: true, destination: true } },
              branch: { select: { id: true, name: true } },
              status: { select: { id: true, name: true } },
            },
          },
          proveedor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
              phone: true,
            },
          },
          reservationStatus: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          updatedBy: { select: { id: true, name: true } },
          passengers: {
            include: {
              passenger: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  documentType: { select: { id: true, name: true } },
                  documentNumber: true,
                  country: { select: { id: true, name: true } },
                  birthDate: true,
                },
              },
            },
            orderBy: { passenger: { createdAt: "asc" } },
          },
        },
      }),
      prisma.documentType.findMany({ orderBy: { name: "asc" } }),
      prisma.country.findMany({ orderBy: { name: "asc" } }),
      getTrips(),
      prisma.reservationStatus.findMany({ orderBy: { name: "asc" } }),
    ])

  if (!reservation) notFound()

  // Map ReservationPassenger join records to flat PassengerRecord array for
  // the form, and serialize Decimals so Next.js can cross to the client.
  const reservationWithPassengers = serializePassengerReservation({
    ...reservation,
    passengers: reservation.passengers.map((rp) => rp.passenger),
  })

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <h1 className="text-xl font-semibold">Gestionar Reserva</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <a
              href={`/api/v1/reservations/passengers/${id}/receipt`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <IconReceipt className="size-4" />
              Descargar recibo
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/reservas">
              <IconArrowLeft className="size-4" />
              Volver a reservas
            </Link>
          </Button>
        </div>
      </div>
      <ManageReservationForm
        reservation={reservationWithPassengers}
        documentTypes={documentTypes}
        countries={countries}
        trips={trips}
        reservationStatuses={reservationStatuses}
      />
    </div>
  )
}
