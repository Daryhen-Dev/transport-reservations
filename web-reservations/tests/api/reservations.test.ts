/**
 * Reservations API smoke tests — passenger CRUD + nested passengers + status,
 * plus a cargo /quick smoke create-and-delete.
 *
 * Run against a live dev server: `npm run dev` + seeded test DB.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { apiFetch, loginAsOwner } from "../_helpers/auth";
import { prisma } from "@/lib/db";

interface Envelope<T> {
  data?: T;
  error?: { code: string; message: string };
}

interface BranchDto {
  id: string;
  slug: string;
  name: string;
}
interface CountryDto {
  id: string;
  name: string;
  code: string;
}
interface RouteDto {
  id: string;
}
interface TripDto {
  id: string;
  status: { id: string; name: string };
}
interface ProveedorDto {
  id: string;
}
interface PassengerReservationDto {
  id: string;
  seatCount: number;
  reservationStatus: { id: string; name: string };
  passengers?: Array<{ passenger: { id: string } }>;
}
interface PassengerDto {
  id: string;
  firstName: string;
  lastName: string;
}
interface CargoReservationDto {
  id: string;
  trip?: { id: string };
}

const TRIP_STATUS_ABIERTO_ID = "tripstatus_abierto";

describe("Reservations API", () => {
  let ownerToken: string;
  let principalBranchId: string;
  let countryId: string;
  let documentTypeId: string;
  let proveedorTypePersonaId: string;
  let reservationStatusPendienteId: string;
  let reservationStatusConfirmadaId: string;
  let cargaCategoriaId: string | undefined;

  let routeId: string;
  let tripId: string;
  let scheduleId: string;

  let proveedorId: string;
  let passengerReservationId = "";
  let cargoReservationId = "";
  // The cargo /quick endpoint may auto-create a separate trip when one does
  // not already exist for the (schedule, date, branch) combo — track its id
  // so we can clean it up alongside the reservation.
  let cargoAutoTripId = "";

  beforeAll(async () => {
    const owner = await loginAsOwner();
    ownerToken = owner.accessToken;

    // ── Resolve seeded fixtures from the DB ────────────────────────────────
    const branches = await apiFetch<Envelope<BranchDto[]>>("/api/v1/branches", {
      bearer: ownerToken,
    });
    const principal = (branches.body.data ?? []).find(
      (b) => b.slug === "principal"
    );
    if (!principal) {
      throw new Error("Seeded 'principal' branch not found");
    }
    principalBranchId = principal.id;

    const countries = await apiFetch<Envelope<CountryDto[]>>(
      "/api/v1/countries",
      { bearer: ownerToken }
    );
    const country = (countries.body.data ?? []).find((c) => c.code === "VE");
    if (!country) throw new Error("Seeded country VE not found");
    countryId = country.id;

    // Lookup tables not exposed via REST — read directly from the DB.
    const docType = await prisma.documentType.findFirst({
      where: { name: "CEDULA DE IDENTIDAD" },
      select: { id: true },
    });
    if (!docType) throw new Error("Seeded documentType not found");
    documentTypeId = docType.id;

    const provType = await prisma.proveedorType.findFirst({
      where: { name: "PERSONA" },
      select: { id: true },
    });
    if (!provType) throw new Error("Seeded proveedorType PERSONA not found");
    proveedorTypePersonaId = provType.id;

    const pendiente = await prisma.reservationStatus.findFirst({
      where: { name: "PENDIENTE" },
      select: { id: true },
    });
    if (!pendiente) throw new Error("Seeded reservationStatus PENDIENTE not found");
    reservationStatusPendienteId = pendiente.id;

    const confirmada = await prisma.reservationStatus.findFirst({
      where: { name: "CONFIRMADA" },
      select: { id: true },
    });
    if (!confirmada) throw new Error("Seeded reservationStatus CONFIRMADA not found");
    reservationStatusConfirmadaId = confirmada.id;

    const categoria = await prisma.cargaCategoria.findFirst({
      where: { name: "OTROS" },
      select: { id: true },
    });
    cargaCategoriaId = categoria?.id;

    // ── Suite fixtures: route + trip + schedule + proveedor ────────────────
    const routeRes = await apiFetch<Envelope<RouteDto>>(
      `/api/v1/routes?branchId=${principalBranchId}`,
      {
        method: "POST",
        bearer: ownerToken,
        body: JSON.stringify({
          origin: "ReservasOrigin",
          destination: "ReservasDestination",
          branchId: principalBranchId,
        }),
      }
    );
    if (routeRes.status !== 201) {
      throw new Error(
        `route fixture failed: ${routeRes.status} ${JSON.stringify(
          routeRes.body
        )}`
      );
    }
    routeId = (routeRes.body.data as RouteDto).id;

    const scheduleRes = await apiFetch<Envelope<{ id: string }>>(
      "/api/v1/trip-schedules",
      {
        method: "POST",
        bearer: ownerToken,
        body: JSON.stringify({ routeId, time: "09:00", isActive: true }),
      }
    );
    if (scheduleRes.status !== 201) {
      throw new Error(
        `schedule fixture failed: ${scheduleRes.status} ${JSON.stringify(
          scheduleRes.body
        )}`
      );
    }
    scheduleId = (scheduleRes.body.data as { id: string }).id;

    const departureAt = new Date(
      Date.now() + 14 * 24 * 60 * 60 * 1000
    ).toISOString();
    const tripRes = await apiFetch<Envelope<TripDto>>("/api/v1/trips", {
      method: "POST",
      bearer: ownerToken,
      body: JSON.stringify({
        routeId,
        branchId: principalBranchId,
        departureAt,
        statusId: TRIP_STATUS_ABIERTO_ID,
      }),
    });
    if (tripRes.status !== 201) {
      throw new Error(
        `trip fixture failed: ${tripRes.status} ${JSON.stringify(tripRes.body)}`
      );
    }
    tripId = (tripRes.body.data as TripDto).id;

    const uniqueDoc = `TEST-${Date.now()}`;
    const proveedorRes = await apiFetch<Envelope<ProveedorDto>>(
      "/api/v1/proveedores",
      {
        method: "POST",
        bearer: ownerToken,
        body: JSON.stringify({
          proveedorTypeId: proveedorTypePersonaId,
          firstName: "Test",
          lastName: "Proveedor",
          countryId,
          documentTypeId,
          documentNumber: uniqueDoc,
        }),
      }
    );
    if (proveedorRes.status !== 201) {
      throw new Error(
        `proveedor fixture failed: ${proveedorRes.status} ${JSON.stringify(
          proveedorRes.body
        )}`
      );
    }
    proveedorId = (proveedorRes.body.data as ProveedorDto).id;
  });

  it("creates a passenger reservation (201, seatCount=2, inline PERSONA proveedor)", async () => {
    // With seatCount>1 the auto-link-passenger path does not fire — we add
    // a passenger explicitly in a later test.
    const uniqueDoc = `BUYER-${Date.now()}`;
    const { status, body } = await apiFetch<Envelope<PassengerReservationDto>>(
      "/api/v1/reservations/passengers",
      {
        method: "POST",
        bearer: ownerToken,
        body: JSON.stringify({
          tripId,
          seatCount: 2,
          proveedorTypeId: proveedorTypePersonaId,
          proveedor: {
            customerType: "PERSONA",
            firstName: "Comprador",
            lastName: "Test",
            documentTypeId,
            documentNumber: uniqueDoc,
            countryId,
          },
          priceAmount: 30,
        }),
      }
    );
    expect(status).toBe(201);
    const reservation = body.data as PassengerReservationDto;
    expect(reservation.seatCount).toBe(2);
    passengerReservationId = reservation.id;
  });

  it("GET /api/v1/reservations/passengers/:id returns the detail envelope", async () => {
    const { status, body } = await apiFetch<Envelope<PassengerReservationDto>>(
      `/api/v1/reservations/passengers/${passengerReservationId}`,
      { bearer: ownerToken }
    );
    expect(status).toBe(200);
    const reservation = body.data as PassengerReservationDto;
    expect(reservation.id).toBe(passengerReservationId);
    expect(Array.isArray(reservation.passengers)).toBe(true);
  });

  it("adds a passenger via mode=create (201)", async () => {
    const uniqueDoc = `PAX-${Date.now()}`;
    const { status, body } = await apiFetch<Envelope<PassengerDto>>(
      `/api/v1/reservations/passengers/${passengerReservationId}/passengers`,
      {
        method: "POST",
        bearer: ownerToken,
        body: JSON.stringify({
          mode: "create",
          passenger: {
            firstName: "Pax",
            lastName: "One",
            documentTypeId,
            documentNumber: uniqueDoc,
            countryId,
          },
        }),
      }
    );
    expect(status).toBe(201);
    const passenger = body.data as PassengerDto;
    expect(passenger.firstName).toBe("Pax");
    expect(passenger.lastName).toBe("One");
  });

  it("PATCHes the reservation status to CONFIRMADA (200)", async () => {
    const { status, body } = await apiFetch<Envelope<PassengerReservationDto>>(
      `/api/v1/reservations/passengers/${passengerReservationId}/status`,
      {
        method: "PATCH",
        bearer: ownerToken,
        body: JSON.stringify({
          reservationStatusId: reservationStatusConfirmadaId,
        }),
      }
    );
    expect(status).toBe(200);
    const reservation = body.data as PassengerReservationDto;
    expect(reservation.reservationStatus.name).toBe("CONFIRMADA");
  });

  it("DELETE the reservation requires PENDIENTE (rollback then delete -> 204)", async () => {
    // The DELETE handler refuses non-PENDIENTE reservations, so revert first.
    const revert = await apiFetch<Envelope<PassengerReservationDto>>(
      `/api/v1/reservations/passengers/${passengerReservationId}/status`,
      {
        method: "PATCH",
        bearer: ownerToken,
        body: JSON.stringify({
          reservationStatusId: reservationStatusPendienteId,
        }),
      }
    );
    expect(revert.status).toBe(200);

    const { status } = await apiFetch(
      `/api/v1/reservations/passengers/${passengerReservationId}`,
      { method: "DELETE", bearer: ownerToken }
    );
    expect(status).toBe(204);
    passengerReservationId = "";
  });

  it("smoke: cargo /quick create + delete (use cargo-status PATCH first to flip to PENDIENTE)", async () => {
    const departureDate = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const createRes = await apiFetch<Envelope<CargoReservationDto>>(
      "/api/v1/reservations/cargo/quick",
      {
        method: "POST",
        bearer: ownerToken,
        body: JSON.stringify({
          scheduleId,
          date: departureDate,
          branchId: principalBranchId,
          proveedorId,
          categoriaId: cargaCategoriaId,
          destinatario: {
            firstName: "Dest",
            lastName: "Test",
            phone: "1234567",
          },
          weightKg: 1.5,
          description: "smoke test cargo",
        }),
      }
    );
    expect(createRes.status).toBe(201);
    const cargoCreated = createRes.body.data as CargoReservationDto;
    cargoReservationId = cargoCreated.id;
    if (cargoCreated.trip?.id) {
      cargoAutoTripId = cargoCreated.trip.id;
    }

    // /quick sets reservationStatus to CONFIRMADA. DELETE requires PENDIENTE,
    // so flip the status via the dedicated endpoint before deleting.
    const flip = await apiFetch(
      `/api/v1/reservations/cargo/${cargoReservationId}/status`,
      {
        method: "PATCH",
        bearer: ownerToken,
        body: JSON.stringify({
          reservationStatusId: reservationStatusPendienteId,
        }),
      }
    );
    expect(flip.status).toBe(200);

    const del = await apiFetch(
      `/api/v1/reservations/cargo/${cargoReservationId}`,
      { method: "DELETE", bearer: ownerToken }
    );
    expect(del.status).toBe(204);
    cargoReservationId = "";
  });

  afterAll(async () => {
    // Best-effort cleanup of fixture rows. If any test failed mid-flight, the
    // reservation/trip/route may still be around — try to remove them.
    try {
      if (passengerReservationId) {
        // Force status back to PENDIENTE so DELETE accepts it.
        try {
          await apiFetch(
            `/api/v1/reservations/passengers/${passengerReservationId}/status`,
            {
              method: "PATCH",
              bearer: ownerToken,
              body: JSON.stringify({
                reservationStatusId: reservationStatusPendienteId,
              }),
            }
          );
        } catch {
          /* ignore */
        }
        await apiFetch(
          `/api/v1/reservations/passengers/${passengerReservationId}`,
          { method: "DELETE", bearer: ownerToken }
        );
      }
      if (cargoReservationId) {
        try {
          await apiFetch(
            `/api/v1/reservations/cargo/${cargoReservationId}/status`,
            {
              method: "PATCH",
              bearer: ownerToken,
              body: JSON.stringify({
                reservationStatusId: reservationStatusPendienteId,
              }),
            }
          );
        } catch {
          /* ignore */
        }
        await apiFetch(`/api/v1/reservations/cargo/${cargoReservationId}`, {
          method: "DELETE",
          bearer: ownerToken,
        });
      }
      if (cargoAutoTripId && cargoAutoTripId !== tripId) {
        await apiFetch(`/api/v1/trips/${cargoAutoTripId}`, {
          method: "DELETE",
          bearer: ownerToken,
        });
      }
      if (tripId) {
        await apiFetch(`/api/v1/trips/${tripId}`, {
          method: "DELETE",
          bearer: ownerToken,
        });
      }
      if (scheduleId) {
        await apiFetch(`/api/v1/trip-schedules/${scheduleId}`, {
          method: "DELETE",
          bearer: ownerToken,
        });
      }
      if (routeId) {
        await apiFetch(`/api/v1/routes/${routeId}`, {
          method: "DELETE",
          bearer: ownerToken,
        });
      }
      if (proveedorId) {
        await apiFetch(`/api/v1/proveedores/${proveedorId}`, {
          method: "DELETE",
          bearer: ownerToken,
        });
      }
    } catch {
      /* best-effort */
    } finally {
      await prisma.$disconnect();
    }
  });
});
