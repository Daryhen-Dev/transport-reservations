import type {
  CreateBranchInput,
  UpdateBranchInput,
} from "./schemas/branches";
import type {
  CreateCountryInput,
  UpdateCountryInput,
} from "./schemas/countries";
import type {
  CreateCrewMemberInput,
  UpdateCrewMemberInput,
} from "./schemas/crew-members";
import type {
  CreatePassengerInput,
  UpdatePassengerInput,
} from "./schemas/passengers";
import type {
  CreateProveedorInput,
  UpdateProveedorInput,
} from "./schemas/proveedores";
import type {
  CreateRouteInput,
  UpdateRouteInput,
} from "./schemas/routes";
import type {
  CreateTripScheduleInput,
  UpdateTripScheduleInput,
} from "./schemas/trip-schedules";
import type {
  CreateTripStatusInput,
  UpdateTripStatusInput,
} from "./schemas/trip-statuses";
import type {
  CreateTripInput,
  UpdateTripInput,
  AssignCrewInput,
} from "./schemas/trips";
import type {
  CreateUserInput,
  UpdateUserInput,
} from "./schemas/users";
import type {
  CreateCargoReservationInput,
  CreateQuickCargoReservationInput,
  UpdateReservationStatusInput as UpdateCargoReservationStatusInput,
  UpdateCargoStatusInput,
} from "./schemas/cargo-reservations";
import type { CalendarDay } from "@/lib/services/calendar.service";

const BASE = "/api/v1";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (res.status === 204) return undefined as T;

  const json = (await res.json().catch(() => ({}))) as {
    data?: unknown;
    error?: { code?: string; message?: string; details?: unknown };
  };

  if (!res.ok) {
    throw new ApiError(
      json.error?.message ?? `Request failed: ${res.status}`,
      res.status,
      json.error?.code,
      json.error?.details
    );
  }

  return json.data as T;
}

export type Branch = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
};

export type Country = {
  id: string;
  name: string;
  nationality: string;
  code: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TripStatus = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  _count?: { trips: number };
};

export type CrewMember = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  documentNumber: string;
  documentType: { id: string; name: string };
  birthDate: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { trips: number };
};

export type CrewMemberSearchResult = {
  id: string;
  firstName: string;
  lastName: string;
  documentNumber: string;
  documentType: { id: string; name: string };
};

export type Passenger = {
  id: string;
  firstName: string;
  lastName: string;
  documentNumber: string;
  documentType: { id: string; name: string };
  country: { id: string; name: string };
  birthDate: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { reservations: number };
};

export type PassengerSearchResult = {
  id: string;
  firstName: string;
  lastName: string;
  documentNumber: string;
  documentType: { id: string; name: string };
  country: { id: string; name: string };
  birthDate: string | null;
};

export type Proveedor = {
  id: string;
  proveedorTypeId: string;
  proveedorType: { id: string; name: string };
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  taxId: string | null;
  contactName: string | null;
  documentTypeId: string | null;
  documentType: { id: string; name: string } | null;
  documentNumber: string | null;
  countryId: string | null;
  country: { id: string; name: string } | null;
  birthDate: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Route = {
  id: string;
  origin: string;
  destination: string;
  branchId: string;
  branch?: { id: string; name: string; slug: string };
  createdAt: string;
  updatedAt: string;
};

export type TripSchedule = {
  id: string;
  routeId: string;
  time: string;
  isActive: boolean;
  route: {
    id: string;
    origin: string;
    destination: string;
    branchId: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type { CalendarDay };

export type TripCrewAssignment = {
  crewMemberId: string;
  crewRoleId: string;
  assignedAt?: string;
  crewMember: { id: string; firstName: string; lastName: string };
  crewRole: { id: string; name: string };
};

export type Trip = {
  id: string;
  departureAt: string;
  routeId: string;
  branchId: string;
  scheduleId: string | null;
  statusId: string;
  route: { id: string; origin: string; destination: string; branchId: string };
  branch: { id: string; name: string; slug: string };
  status: { id: string; name: string };
  schedule: {
    id: string;
    routeId: string;
    time: string;
    isActive: boolean;
  } | null;
  crew: TripCrewAssignment[];
  manifest: { id: string; code: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type CrewAssignmentResult = TripCrewAssignment & {
  tripId: string;
  allCrewAssigned: boolean;
};

export type CargoReservation = {
  id: string;
  tripId: string;
  weightKg: number;
  description: string | null;
  destinationBranchId: string | null;
  externalDestination: string | null;
  diameterCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  lengthCm: number | null;
  trip: {
    id: string;
    departureAt: string;
    route: { id: string; origin: string; destination: string };
    branch: { id: string; name: string };
    manifest: { code: string } | null;
    status: { id: string; name: string };
  };
  proveedor: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    companyName: string | null;
    proveedorTypeId: string;
  };
  reservationStatus: { id: string; name: string };
  cargoStatus: { id: string; name: string } | null;
  destinationBranch: { id: string; name: string } | null;
  categoria: { id: string; name: string } | null;
  destinatario: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  branchId: string | null;
  createdAt: string;
  updatedAt: string;
  branch: { id: string; name: string; slug: string } | null;
  role: { id: string; name: string };
};

export type ManifestLookupResult = {
  id: string;
  code: string;
  receivedByBranchId: string | null;
  receivedAt: string | null;
  trip: {
    departureAt: string;
    branch: { id: string; name: string; slug: string };
    route: { origin: string; destination: string };
    status: { name: string };
    crew: Array<{
      crewMember: {
        firstName: string;
        lastName: string;
        documentNumber: string;
        documentType: { name: string };
      };
      crewRole: { name: string };
    }>;
    passengerReservations: Array<{
      seatCount: number;
      proveedor: {
        firstName: string | null;
        lastName: string | null;
        companyName: string | null;
        proveedorType: { name: string };
      };
      passengers: Array<{
        passenger: {
          firstName: string;
          lastName: string;
          documentNumber: string;
          documentType: { name: string };
        };
      }>;
    }>;
    cargoReservations: Array<{
      weightKg: number;
      description: string | null;
      categoria: { name: string } | null;
      destinatario: {
        firstName: string;
        lastName: string;
        phone: string | null;
      } | null;
      proveedor: {
        firstName: string | null;
        lastName: string | null;
        companyName: string | null;
      };
      destinationBranch: { name: string } | null;
      externalDestination: string | null;
    }>;
  };
};

export const api = {
  branches: {
    list: () => request<Branch[]>("/branches"),
    get: (id: string) => request<Branch>(`/branches/${id}`),
    create: (data: CreateBranchInput) =>
      request<Branch>("/branches", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: UpdateBranchInput) =>
      request<Branch>(`/branches/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>(`/branches/${id}`, { method: "DELETE" }),
    setActive: (branchId: string) =>
      request<void>("/branches/active", {
        method: "POST",
        body: JSON.stringify({ branchId }),
      }),
    clearActive: () =>
      request<void>("/branches/active", { method: "DELETE" }),
  },
  countries: {
    list: () => request<Country[]>("/countries"),
    create: (data: CreateCountryInput) =>
      request<Country>("/countries", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: UpdateCountryInput) =>
      request<Country>(`/countries/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>(`/countries/${id}`, { method: "DELETE" }),
  },
  tripStatuses: {
    list: () => request<TripStatus[]>("/trip-statuses"),
    create: (data: CreateTripStatusInput) =>
      request<TripStatus>("/trip-statuses", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: UpdateTripStatusInput) =>
      request<TripStatus>(`/trip-statuses/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>(`/trip-statuses/${id}`, { method: "DELETE" }),
  },
  calendar: {
    get: (params: { year: number; month: number; branchId?: string }) => {
      const q = new URLSearchParams();
      q.set("year", String(params.year));
      q.set("month", String(params.month));
      if (params.branchId) q.set("branchId", params.branchId);
      return request<CalendarDay[]>(`/calendar?${q.toString()}`);
    },
  },
  crewMembers: {
    list: () => request<CrewMember[]>("/crew-members"),
    search: (q: string) => {
      const params = new URLSearchParams({ q });
      return request<CrewMemberSearchResult[]>(
        `/crew-members?${params.toString()}`
      );
    },
    create: (data: CreateCrewMemberInput) =>
      request<CrewMember>("/crew-members", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: UpdateCrewMemberInput) =>
      request<CrewMember>(`/crew-members/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>(`/crew-members/${id}`, { method: "DELETE" }),
  },
  passengers: {
    list: () => request<Passenger[]>("/passengers"),
    search: (q: string) => {
      const params = new URLSearchParams({ q });
      return request<PassengerSearchResult[]>(
        `/passengers?${params.toString()}`
      );
    },
    create: (data: CreatePassengerInput) =>
      request<Passenger>("/passengers", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: UpdatePassengerInput) =>
      request<Passenger>(`/passengers/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>(`/passengers/${id}`, { method: "DELETE" }),
  },
  proveedores: {
    list: (params?: { typeId?: string }) => {
      const q = new URLSearchParams();
      if (params?.typeId) q.set("typeId", params.typeId);
      const qs = q.toString();
      return request<Proveedor[]>(`/proveedores${qs ? `?${qs}` : ""}`);
    },
    search: (q: string, typeId?: string) => {
      const params = new URLSearchParams({ q });
      if (typeId) params.set("typeId", typeId);
      return request<Proveedor[]>(`/proveedores?${params.toString()}`);
    },
    create: (data: CreateProveedorInput) =>
      request<Proveedor>("/proveedores", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: UpdateProveedorInput) =>
      request<Proveedor>(`/proveedores/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>(`/proveedores/${id}`, { method: "DELETE" }),
  },
  routes: {
    list: (branchId: string) => {
      const params = new URLSearchParams({ branchId });
      return request<Route[]>(`/routes?${params.toString()}`);
    },
    get: (id: string) => request<Route>(`/routes/${id}`),
    create: (data: CreateRouteInput) =>
      request<Route>("/routes", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: UpdateRouteInput) =>
      request<Route>(`/routes/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>(`/routes/${id}`, { method: "DELETE" }),
  },
  tripSchedules: {
    listByRoute: (routeId: string) => {
      const params = new URLSearchParams({ routeId });
      return request<TripSchedule[]>(`/trip-schedules?${params.toString()}`);
    },
    listByBranch: (branchId: string) => {
      const params = new URLSearchParams({ branchId });
      return request<TripSchedule[]>(`/trip-schedules?${params.toString()}`);
    },
    create: (data: CreateTripScheduleInput) =>
      request<TripSchedule>("/trip-schedules", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: UpdateTripScheduleInput) =>
      request<TripSchedule>(`/trip-schedules/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>(`/trip-schedules/${id}`, { method: "DELETE" }),
    toggle: (id: string) =>
      request<TripSchedule>(`/trip-schedules/${id}/toggle`, {
        method: "PATCH",
      }),
  },
  manifests: {
    lookup: (code: string) =>
      request<ManifestLookupResult>(`/manifests/${encodeURIComponent(code)}`),
    pdfUrl: (code: string) =>
      `${BASE}/manifests/${encodeURIComponent(code)}/pdf`,
    generate: (tripId: string) =>
      request<{ id: string; code: string; tripId: string; createdAt: string; alreadyExisted?: boolean }>(
        `/trips/${tripId}/manifest`,
        { method: "POST" }
      ),
  },
  users: {
    list: () => request<User[]>("/users"),
    get: (id: string) => request<User>(`/users/${id}`),
    create: (data: CreateUserInput) =>
      request<User>("/users", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: UpdateUserInput) =>
      request<User>(`/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>(`/users/${id}`, { method: "DELETE" }),
  },
  trips: {
    list: (params: { branchId: string; date?: string }) => {
      const q = new URLSearchParams({ branchId: params.branchId });
      if (params.date) q.set("date", params.date);
      return request<Trip[]>(`/trips?${q.toString()}`);
    },
    get: (id: string) => request<Trip>(`/trips/${id}`),
    create: (data: CreateTripInput) =>
      request<Trip>("/trips", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: UpdateTripInput) =>
      request<Trip>(`/trips/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>(`/trips/${id}`, { method: "DELETE" }),
    close: (id: string) =>
      request<Trip>(`/trips/${id}/close`, { method: "POST" }),
    open: (id: string) =>
      request<Trip>(`/trips/${id}/open`, { method: "POST" }),
    assignCrew: (
      tripId: string,
      crewMemberId: string,
      data: AssignCrewInput
    ) =>
      request<CrewAssignmentResult>(
        `/trips/${tripId}/crew/${crewMemberId}`,
        { method: "PUT", body: JSON.stringify(data) }
      ),
    removeCrew: (tripId: string, crewMemberId: string) =>
      request<void>(`/trips/${tripId}/crew/${crewMemberId}`, {
        method: "DELETE",
      }),
  },
  reservations: {
    cargo: {
      list: (params: { branchId: string }) => {
        const q = new URLSearchParams({ branchId: params.branchId });
        return request<CargoReservation[]>(`/reservations/cargo?${q.toString()}`);
      },
      create: (data: CreateCargoReservationInput) =>
        request<CargoReservation>("/reservations/cargo", {
          method: "POST",
          body: JSON.stringify(data),
        }),
      createQuick: (data: CreateQuickCargoReservationInput) =>
        request<CargoReservation>("/reservations/cargo/quick", {
          method: "POST",
          body: JSON.stringify(data),
        }),
      delete: (id: string) =>
        request<void>(`/reservations/cargo/${id}`, { method: "DELETE" }),
      setStatus: (id: string, data: UpdateCargoReservationStatusInput) =>
        request<CargoReservation>(`/reservations/cargo/${id}/status`, {
          method: "PATCH",
          body: JSON.stringify(data),
        }),
      setCargoStatus: (id: string, data: UpdateCargoStatusInput) =>
        request<CargoReservation>(`/reservations/cargo/${id}/cargo-status`, {
          method: "PATCH",
          body: JSON.stringify(data),
        }),
    },
  },
};
