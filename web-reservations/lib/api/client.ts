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
  CreateTripStatusInput,
  UpdateTripStatusInput,
} from "./schemas/trip-statuses";
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

export type { CalendarDay };

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
};
