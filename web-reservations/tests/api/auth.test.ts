/**
 * Auth API smoke tests — login, refresh rotation, logout.
 *
 * Run against a live dev server: `npm run dev` + seeded test DB.
 * Set TEST_BASE_URL to override the default `http://localhost:3000`.
 */
import { describe, it, expect } from "vitest";
import { apiFetch, loginAsOwner, loginAsBranchUser } from "../_helpers/auth";

interface LoginEnvelope {
  data?: {
    accessToken: string;
    refreshToken: string;
    expiresIn?: number;
    user: {
      id: string;
      email: string;
      role: string;
      branchId: string | null;
    };
  };
  error?: { code: string; message: string };
}

describe("POST /api/v1/auth/login", () => {
  it("returns tokens + OWNER payload for the seeded owner", async () => {
    const { status, body } = await apiFetch<LoginEnvelope>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "owner@system.com",
        password: "Admin1234!",
      }),
    });

    expect(status).toBe(200);
    expect(body.data).toBeDefined();
    expect(body.data?.accessToken).toEqual(expect.any(String));
    expect(body.data?.refreshToken).toEqual(expect.any(String));
    expect(typeof body.data?.expiresIn).toBe("number");
    expect(body.data?.user.role).toBe("OWNER");
    expect(body.data?.user.branchId).toBeNull();
  });

  it("returns tokens + SUCURSAL_USER payload (with branchId) for the seeded user", async () => {
    const { status, body } = await apiFetch<LoginEnvelope>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "user@system.com",
        password: "User1234!",
      }),
    });

    expect(status).toBe(200);
    expect(body.data?.user.role).toBe("SUCURSAL_USER");
    expect(body.data?.user.branchId).not.toBeNull();
    expect(typeof body.data?.user.branchId).toBe("string");
  });

  it("returns 401 INVALID_CREDENTIALS for bogus credentials", async () => {
    const { status, body } = await apiFetch<LoginEnvelope>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "wrong@email.com",
        password: "nope",
      }),
    });

    expect(status).toBe(401);
    expect(body.error?.code).toBe("INVALID_CREDENTIALS");
    expect(typeof body.error?.message).toBe("string");
  });
});

describe("POST /api/v1/auth/refresh", () => {
  it("rotates the refresh token: old token becomes invalid", async () => {
    const initial = await loginAsOwner();

    const first = await apiFetch<LoginEnvelope>("/api/v1/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken: initial.refreshToken }),
    });

    expect(first.status).toBe(200);
    expect(first.body.data?.accessToken).toEqual(expect.any(String));
    expect(first.body.data?.refreshToken).toEqual(expect.any(String));
    // New refresh token must differ from the original.
    expect(first.body.data?.refreshToken).not.toBe(initial.refreshToken);
    // Access token should also be a freshly minted value.
    expect(first.body.data?.accessToken).not.toBe(initial.accessToken);

    // Re-using the original (now-rotated) token must fail.
    const second = await apiFetch<LoginEnvelope>("/api/v1/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken: initial.refreshToken }),
    });

    expect(second.status).toBe(401);
    expect(second.body.error?.code).toBe("INVALID_TOKEN");

    // Cleanup: revoke the newly minted refresh token so we don't leak state.
    if (first.body.data?.refreshToken) {
      await apiFetch("/api/v1/auth/logout", {
        method: "DELETE",
        bearer: first.body.data.accessToken,
        body: JSON.stringify({ refreshToken: first.body.data.refreshToken }),
      });
    }
  });
});

describe("DELETE /api/v1/auth/logout", () => {
  it("revokes a refresh token (subsequent refresh returns 401)", async () => {
    const session = await loginAsBranchUser();

    const logout = await apiFetch("/api/v1/auth/logout", {
      method: "DELETE",
      bearer: session.accessToken,
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    expect(logout.status).toBe(204);

    // Refresh with the now-revoked token must fail.
    const refresh = await apiFetch<LoginEnvelope>("/api/v1/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    expect(refresh.status).toBe(401);
    expect(refresh.body.error?.code).toBe("INVALID_TOKEN");
  });
});
