import type {
  CreateBranchInput,
  UpdateBranchInput,
} from "./schemas/branches";

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
};
