import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireBranchAccess } from "@/lib/api/auth";
import { createPassengerReservationSchema } from "@/lib/api/schemas/passenger-reservations";
import { auditCreate } from "@/lib/api/audit";

const RESERVATION_INCLUDE = {
  trip: {
    include: {
      route: {
        select: {
          id: true,
          origin: true,
          destination: true,
          directPriceAmount: true,
          incomingAgencyPriceAmount: true,
          outgoingCommissionAmount: true,
          minPrice: true,
        },
      },
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
      proveedorTypeId: true,
      phone: true,
    },
  },
  referredByAgency: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      companyName: true,
    },
  },
  reservationStatus: { select: { id: true, name: true } },
  _count: { select: { passengers: true } },
} as const;

export async function GET(req: NextRequest) {
  const authOrError = await requireAuth(req);
  if (authOrError instanceof NextResponse) return authOrError;

  const url = new URL(req.url);
  const branchId = url.searchParams.get("branchId") ?? undefined;

  if (!branchId) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "branchId required" } },
      { status: 400 }
    );
  }

  const gate = await requireBranchAccess(req, branchId);
  if (gate instanceof NextResponse) return gate;

  const reservations = await prisma.passengerReservation.findMany({
    where: { trip: { branchId } },
    include: RESERVATION_INCLUDE,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: reservations });
}

export async function POST(req: NextRequest) {
  const authOrError = await requireAuth(req);
  if (authOrError instanceof NextResponse) return authOrError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON" } },
      { status: 400 }
    );
  }

  const parsed = createPassengerReservationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: parsed.error.issues[0]?.message ?? "Invalid body",
        },
      },
      { status: 400 }
    );
  }

  const {
    tripId,
    seatCount,
    proveedor,
    proveedorTypeId,
    passengers,
    priceAmount,
    referredByAgencyId: referredByAgencyIdInput,
    commissionAmount: commissionAmountInput,
  } = parsed.data;
  let { reservationStatusId } = parsed.data;

  const referredByAgencyId = referredByAgencyIdInput ?? null;
  const commissionAmount = commissionAmountInput ?? null;

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      status: { select: { name: true } },
      route: {
        select: {
          directPriceAmount: true,
          incomingAgencyPriceAmount: true,
          outgoingCommissionAmount: true,
          minPrice: true,
        },
      },
    },
  });
  if (!trip) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Viaje no encontrado" } },
      { status: 404 }
    );
  }

  const gate = await requireBranchAccess(req, trip.branchId);
  if (gate instanceof NextResponse) return gate;

  if (trip.status.name === "CERRADO") {
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message: "Este viaje está cerrado y no acepta nuevas reservas",
        },
      },
      { status: 409 }
    );
  }

  // Resolver tipo del comprador para derivar el precio sugerido.
  const buyerType = await prisma.proveedorType.findUnique({
    where: { id: proveedorTypeId },
    select: { name: true },
  });
  if (!buyerType) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Tipo de proveedor inválido" } },
      { status: 400 }
    );
  }

  if (referredByAgencyId) {
    const refAgency = await prisma.proveedor.findUnique({
      where: { id: referredByAgencyId },
      include: { proveedorType: { select: { name: true } } },
    });
    if (!refAgency || refAgency.proveedorType.name !== "AGENCIA") {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "La agencia que refirió debe ser un proveedor tipo AGENCIA",
          },
        },
        { status: 400 }
      );
    }
  }

  const minPrice = Number(trip.route.minPrice);
  if (priceAmount < minPrice) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: `El precio no puede ser menor al mínimo ($${minPrice.toFixed(2)})`,
        },
      },
      { status: 400 }
    );
  }

  const suggestedAmount =
    buyerType.name === "AGENCIA" || buyerType.name === "INSTITUCION_PUBLICA"
      ? Number(trip.route.incomingAgencyPriceAmount)
      : Number(trip.route.directPriceAmount);

  if (!reservationStatusId) {
    const pendiente = await prisma.reservationStatus.findFirst({
      where: { name: { contains: "pendiente", mode: "insensitive" } },
      select: { id: true },
    });
    if (!pendiente) {
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL",
            message: "Estado PENDIENTE no encontrado. Ejecute el seed.",
          },
        },
        { status: 500 }
      );
    }
    reservationStatusId = pendiente.id;
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const newProveedor = await tx.proveedor.create({
        data: {
          proveedorTypeId,
          firstName: proveedor.firstName,
          lastName: proveedor.lastName,
          documentTypeId: proveedor.documentTypeId,
          documentNumber: proveedor.documentNumber,
          countryId: proveedor.countryId,
          birthDate: proveedor.birthDate
            ? new Date(proveedor.birthDate)
            : undefined,
        },
      });

      const reservation = await tx.passengerReservation.create({
        data: {
          tripId,
          proveedorId: newProveedor.id,
          seatCount,
          priceAmount,
          suggestedAmount,
          referredByAgencyId,
          commissionAmount,
          reservationStatusId: reservationStatusId!,
          ...auditCreate(authOrError.userId),
        },
      });

      // Auto-link proveedor as passenger when seatCount === 1.
      // Matches the legacy server-action behavior.
      const autoPassengers =
        seatCount === 1
          ? [
              {
                firstName: proveedor.firstName,
                lastName: proveedor.lastName,
                documentTypeId: proveedor.documentTypeId,
                documentNumber: proveedor.documentNumber,
                countryId: proveedor.countryId,
                birthDate: proveedor.birthDate,
              },
              ...(passengers ?? []),
            ]
          : (passengers ?? []);

      for (const c of autoPassengers) {
        const p = await tx.passenger.upsert({
          where: {
            documentTypeId_documentNumber: {
              documentTypeId: c.documentTypeId,
              documentNumber: c.documentNumber,
            },
          },
          create: {
            firstName: c.firstName,
            lastName: c.lastName,
            documentTypeId: c.documentTypeId,
            documentNumber: c.documentNumber,
            countryId: c.countryId,
            birthDate: c.birthDate ? new Date(c.birthDate) : undefined,
          },
          update: {},
        });
        const alreadyLinked = await tx.reservationPassenger.findUnique({
          where: {
            reservationId_passengerId: {
              reservationId: reservation.id,
              passengerId: p.id,
            },
          },
        });
        if (!alreadyLinked) {
          await tx.reservationPassenger.create({
            data: { reservationId: reservation.id, passengerId: p.id },
          });
        }
      }

      return tx.passengerReservation.findUniqueOrThrow({
        where: { id: reservation.id },
        include: RESERVATION_INCLUDE,
      });
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Error al crear la reserva",
        },
      },
      { status: 400 }
    );
  }
}
