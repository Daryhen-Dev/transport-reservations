import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/with-auth";

const LIMIT = 5;

export const GET = withAuth(async (req, { auth }) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const branchId = url.searchParams.get("branchId") ?? undefined;

  if (q.length < 2) {
    return NextResponse.json({
      data: {
        reservations: [],
        passengers: [],
        proveedores: [],
        manifests: [],
        trips: [],
      },
    });
  }

  // Branch scoping: SUCURSAL_USER siempre limitado a su sucursal.
  // OWNER: si vino branchId, se usa; si no, ve todo.
  const effectiveBranchId =
    auth.role === "SUCURSAL_USER" ? auth.branchId ?? undefined : branchId;

  // For reservation/trip/manifest searches, we filter by branchId.
  const branchFilter = effectiveBranchId ? { branchId: effectiveBranchId } : {};
  const tripBranchFilter = effectiveBranchId
    ? { trip: { branchId: effectiveBranchId } }
    : {};

  // The reservation "code" is PR-<last 8 of cuid>. To match, accept either the
  // user typing the suffix directly or the full PR-prefix.
  const codeQuery = q.toUpperCase().replace(/^PR-/, "");

  const [reservations, passengers, proveedores, manifests, trips] = await Promise.all([
    // Reservas: por proveedor name/companyName, o por sufijo del id
    prisma.passengerReservation.findMany({
      where: {
        ...tripBranchFilter,
        OR: [
          { id: { endsWith: codeQuery.toLowerCase(), mode: "insensitive" } },
          {
            proveedor: {
              OR: [
                { firstName: { contains: q, mode: "insensitive" } },
                { lastName: { contains: q, mode: "insensitive" } },
                { companyName: { contains: q, mode: "insensitive" } },
                { documentNumber: { contains: q, mode: "insensitive" } },
              ],
            },
          },
        ],
      },
      select: {
        id: true,
        seatCount: true,
        trip: {
          select: {
            departureAt: true,
            route: { select: { origin: true, destination: true } },
            branch: { select: { name: true } },
          },
        },
        proveedor: {
          select: { firstName: true, lastName: true, companyName: true },
        },
        reservationStatus: { select: { name: true } },
      },
      take: LIMIT,
      orderBy: { createdAt: "desc" },
    }),

    // Pasajeros: por nombre, apellido, documento
    prisma.passenger.findMany({
      where: {
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { documentNumber: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        documentNumber: true,
        documentType: { select: { name: true } },
        country: { select: { name: true } },
      },
      take: LIMIT,
      orderBy: { firstName: "asc" },
    }),

    // Proveedores: por nombre, empresa, documento, RIF
    prisma.proveedor.findMany({
      where: {
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { companyName: { contains: q, mode: "insensitive" } },
          { documentNumber: { contains: q, mode: "insensitive" } },
          { taxId: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        companyName: true,
        taxId: true,
        documentNumber: true,
        proveedorType: { select: { name: true } },
      },
      take: LIMIT,
    }),

    // Manifiestos: por código exacto o parcial
    prisma.tripManifest.findMany({
      where: {
        code: { contains: codeQuery, mode: "insensitive" },
        ...(effectiveBranchId
          ? { trip: { branchId: effectiveBranchId } }
          : {}),
      },
      select: {
        code: true,
        createdAt: true,
        trip: {
          select: {
            departureAt: true,
            route: { select: { origin: true, destination: true } },
            branch: { select: { name: true } },
          },
        },
      },
      take: LIMIT,
    }),

    // Viajes: por ruta (origen o destino)
    prisma.trip.findMany({
      where: {
        ...branchFilter,
        OR: [
          { route: { origin: { contains: q, mode: "insensitive" } } },
          { route: { destination: { contains: q, mode: "insensitive" } } },
        ],
      },
      select: {
        id: true,
        departureAt: true,
        route: { select: { origin: true, destination: true } },
        branch: { select: { name: true } },
        status: { select: { name: true } },
      },
      take: LIMIT,
      orderBy: { departureAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    data: {
      reservations: reservations.map((r) => ({
        id: r.id,
        code: `PR-${r.id.slice(-8).toUpperCase()}`,
        proveedorName:
          r.proveedor.companyName ??
          `${r.proveedor.firstName ?? ""} ${r.proveedor.lastName ?? ""}`.trim(),
        tripRoute: `${r.trip.route.origin} → ${r.trip.route.destination}`,
        tripDate: r.trip.departureAt,
        branchName: r.trip.branch.name,
        seatCount: r.seatCount,
        status: r.reservationStatus.name,
      })),
      passengers: passengers.map((p) => ({
        id: p.id,
        name: `${p.firstName} ${p.lastName}`,
        document: `${p.documentType.name} ${p.documentNumber}`,
        country: p.country.name,
      })),
      proveedores: proveedores.map((p) => ({
        id: p.id,
        name:
          p.companyName ??
          `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() ??
          "Sin nombre",
        type: p.proveedorType.name,
        document: p.taxId ?? p.documentNumber ?? null,
      })),
      manifests: manifests.map((m) => ({
        code: m.code,
        tripRoute: `${m.trip.route.origin} → ${m.trip.route.destination}`,
        tripDate: m.trip.departureAt,
        branchName: m.trip.branch.name,
      })),
      trips: trips.map((t) => ({
        id: t.id,
        route: `${t.route.origin} → ${t.route.destination}`,
        departureAt: t.departureAt,
        branchName: t.branch.name,
        status: t.status.name,
      })),
    },
  });
});
