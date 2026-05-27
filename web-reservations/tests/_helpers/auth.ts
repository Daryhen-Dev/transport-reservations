/**
 * Auth helpers shared by Vitest (API) and Playwright (web) smoke tests.
 *
 * - `loginAsOwner()` / `loginAsBranchUser()` POST the seeded credentials to
 *   `/api/v1/auth/login` and return the parsed token pair + user payload.
 * - `apiFetch()` is a thin `fetch` wrapper that auto-attaches the Bearer
 *   token and parses the JSON envelope returned by the v1 API.
 *
 * Cookie-based (NextAuth) auth is intentionally NOT covered here. The
 * /api/auth/callback/credentials flow is awkward to drive from a vitest
 * context, and our smoke tests can reach every endpoint via Bearer. If a
 * future web test needs a session cookie, drive it through the real login
 * page in Playwright instead.
 */

const DEFAULT_BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";

const SEEDED_OWNER = {
  email: "owner@system.com",
  password: "Admin1234!",
} as const;

const SEEDED_BRANCH_USER = {
  email: "user@system.com",
  password: "User1234!",
} as const;

export interface LoginUser {
  id: string;
  email: string;
  role: string;
  branchId: string | null;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: LoginUser;
}

interface LoginResponseBody {
  data?: {
    accessToken: string;
    refreshToken: string;
    expiresIn?: number;
    user: {
      id: string;
      name?: string;
      email: string;
      role: string;
      branchId: string | null;
    };
  };
  error?: { code: string; message: string };
}

async function loginWithCredentials(
  credentials: { email: string; password: string },
  baseUrl: string = DEFAULT_BASE_URL
): Promise<LoginResult> {
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  const body = (await response.json()) as LoginResponseBody;

  if (!response.ok || !body.data) {
    const message = body.error?.message ?? `login failed (${response.status})`;
    throw new Error(`loginWithCredentials: ${message}`);
  }

  return {
    accessToken: body.data.accessToken,
    refreshToken: body.data.refreshToken,
    user: {
      id: body.data.user.id,
      email: body.data.user.email,
      role: body.data.user.role,
      branchId: body.data.user.branchId,
    },
  };
}

/**
 * Logs in as the seeded OWNER (`owner@system.com`).
 * Returns Bearer + refresh tokens and the user payload.
 */
export async function loginAsOwner(baseUrl?: string): Promise<LoginResult> {
  return loginWithCredentials(SEEDED_OWNER, baseUrl);
}

/**
 * Logs in as the seeded SUCURSAL_USER (`user@system.com`).
 * Returns Bearer + refresh tokens and the user payload.
 */
export async function loginAsBranchUser(
  baseUrl?: string
): Promise<LoginResult> {
  return loginWithCredentials(SEEDED_BRANCH_USER, baseUrl);
}

export interface ApiFetchInit extends Omit<RequestInit, "headers"> {
  bearer?: string;
  baseUrl?: string;
  headers?: Record<string, string>;
}

export interface ApiFetchResult<T> {
  status: number;
  body: T;
}

/**
 * `fetch` wrapper that:
 * - Prefixes `path` with `TEST_BASE_URL` (or the override).
 * - Auto-attaches `Authorization: Bearer <bearer>` when provided.
 * - Defaults `Content-Type: application/json` for bodied requests.
 * - Returns `{ status, body }` where `body` is parsed JSON (or `{}` for empty
 *   responses like 204 No Content).
 */
export async function apiFetch<T = unknown>(
  path: string,
  init: ApiFetchInit = {}
): Promise<ApiFetchResult<T>> {
  const { bearer, baseUrl, headers: extraHeaders, ...rest } = init;
  const url = `${baseUrl ?? DEFAULT_BASE_URL}${path}`;

  const headers: Record<string, string> = { ...(extraHeaders ?? {}) };
  if (bearer && !headers.Authorization) {
    headers.Authorization = `Bearer ${bearer}`;
  }
  if (rest.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, { ...rest, headers });

  let body: T;
  if (response.status === 204) {
    body = {} as T;
  } else {
    const text = await response.text();
    body = (text ? JSON.parse(text) : {}) as T;
  }

  return { status: response.status, body };
}
