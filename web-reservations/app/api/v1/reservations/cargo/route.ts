import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, requireBranchAccess } from "@/lib/api/auth";
import { createCargoReservationSchema } from "@/lib/api/schemas/cargo-reservations";
import { auditCreate } from "@/lib/api/audit";

const CARGO_INCLUDE = {
  trip: {
    include: {
      route: { select: { id: true, origin: true, destination: true } },
      branch: { select: { id: true, name: true } },
      manifest: { select: { code: true } },
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
    },
  },
  reservationStatus: { select: { id: true, name: true } },
  cargoStatus: { select: { id: true, name: true } },
  destinationBranch: { select: { id: true, name: true } },
  categoria: { select: { id: true, name: true } },
  destinatario: {
    select: { id: true, firstName: true, lastName: true, phone: true },
  },
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

  const reservations = await prisma.cargoReservation.findMany({
    where: { trip: { branchId } },
    include: CARGO_INCLUDE,
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

  const parsed = createCargoReservationSchema.safeParse(body);
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
    weightKg,
    priceAmount,
    cobrarEnDestino,
    categoriaId,
    description,
    destinationBranchId,
    externalDestination,
    destinatario,
    proveedor,
    proveedorTypeId,
    reservationStatusId,
  } = parsed.data;

  // Branch-scoped via the trip's branch.
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { status: { select: { name: true } } },
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

      const newDestinatario = await tx.destinatario.create({
        data: {
          firstName: destinatario.firstName,
          lastName: destinatario.lastName,
          phone: destinatario.phone ?? undefined,
          documentTypeId: destinatario.documentTypeId || undefined,
          documentNumber: destinatario.documentNumber || undefined,
        },
      });

      return tx.cargoReservation.create({
        data: {
          tripId,
          proveedorId: newProveedor.id,
          categoriaId,
          destinatarioId: newDestinatario.id,
          description: description || undefined,
          weightKg,
          priceAmount,
          cobrarEnDestino: cobrarEnDestino ?? false,
          destinationBranchId: destinationBranchId || undefined,
          externalDestination: externalDestination || undefined,
          reservationStatusId,
          ...auditCreate(authOrError.userId),
        },
        include: CARGO_INCLUDE,
      });
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Error al crear la reserva de encomienda",
        },
      },
      { status: 400 }
    );
  }
}
