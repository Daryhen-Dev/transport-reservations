import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { requireBranchAccess } from "@/lib/api/auth";

function generateCode(
  branchName: string,
  departureAt: Date,
  destination: string
): string {
  const O = branchName
    .replace(/[^a-zA-Z]/g, "")
    .padEnd(2, "X")
    .substring(0, 2)
    .toUpperCase();
  const D = destination
    .replace(/[^a-zA-Z]/g, "")
    .padEnd(2, "X")
    .substring(0, 2)
    .toUpperCase();
  const yy = departureAt.getFullYear().toString().slice(-2);
  const mm = (departureAt.getMonth() + 1).toString().padStart(2, "0");
  const dd = departureAt.getDate().toString().padStart(2, "0");
  const mixed = `${O[0]}${yy[0]}${O[1]}${yy[1]}${D[0]}${mm[0]}${D[1]}${mm[1]}${dd}`;
  const rand = randomBytes(2).toString("hex").toUpperCase();
  return `${mixed}${rand}`;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await ctx.params;

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      branch: { select: { id: true, name: true } },
      route: { select: { destination: true } },
      status: { select: { name: true } },
      manifest: { select: { code: true } },
    },
  });
  if (!trip) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Viaje no encontrado" } },
      { status: 404 }
    );
  }

  const access = await requireBranchAccess(req, trip.branchId);
  if (access instanceof NextResponse) return access;

  if (trip.status.name !== "CERRADO") {
    return NextResponse.json(
      {
        error: {
          code: "CONFLICT",
          message: "Solo se puede generar el manifiesto de viajes cerrados",
        },
      },
      { status: 409 }
    );
  }

  if (trip.manifest) {
    return NextResponse.json(
      { data: { code: trip.manifest.code, alreadyExisted: true } },
      { status: 200 }
    );
  }

  const code = generateCode(trip.branch.name, trip.departureAt, trip.route.destination);

  const manifest = await prisma.tripManifest.create({
    data: { code, tripId },
    select: { code: true, id: true, tripId: true, createdAt: true },
  });

  await prisma.cargoReservation.updateMany({
    where: { tripId, cargoStatusId: null },
    data: { cargoStatusId: "cargostatus_transito" },
  });

  return NextResponse.json({ data: manifest }, { status: 201 });
}
