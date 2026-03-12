import { notFound } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { getTrips } from "@/lib/services/trip.service"
import { AgencySidebar } from "@/components/agency-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { IconArrowLeft } from "@tabler/icons-react"
import { ManageReservationForm } from "./_components/manage-reservation-form"

export default async function ManageReservationPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>
}) {
  const { slug, id } = await params

  const session = await auth()
  const user = {
    name: session?.user?.name ?? "",
    email: session?.user?.email ?? "",
  }

  const [reservation, documentTypes, countries, trips] = await Promise.all([
    prisma.passengerReservation.findUnique({
      where: { id },
      include: {
        trip: {
          include: {
            route: { select: { id: true, origin: true, destination: true } },
            branch: { select: { id: true, name: true } },
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
  ])

  if (!reservation) notFound()

  // Map ReservationPassenger join records to flat PassengerRecord array for the form
  const reservationWithPassengers = {
    ...reservation,
    passengers: reservation.passengers.map((rp) => rp.passenger),
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AgencySidebar variant="inset" slug={slug} user={user} />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="flex items-center justify-between px-4 lg:px-6">
                <h1 className="text-xl font-semibold">Gestionar Reserva</h1>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/${slug}/reservas-pasajeros`}>
                    <IconArrowLeft className="size-4" />
                    Volver a reservas
                  </Link>
                </Button>
              </div>
              <ManageReservationForm
                reservation={reservationWithPassengers}
                documentTypes={documentTypes}
                countries={countries}
                trips={trips}
                slug={slug}
              />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
