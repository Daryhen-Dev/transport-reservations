/**
 * Branches API smoke tests — CRUD + role gates + active-branch cookie.
 *
 * Run against a live dev server: `npm run dev` + seeded test DB.
 */
import { describe, it, expect, afterAll } from "vitest";
import { apiFetch, loginAsOwner, loginAsBranchUser } from "../_helpers/auth";

interface BranchDto {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

interface BranchEnvelope {
  data?: BranchDto | BranchDto[];
  error?: { code: string; message: string };
}

const TEST_BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";

// Per-suite cleanup: track ids we create so we can DELETE them in afterAll
// even if individual `it` blocks bail early.
const createdBranchIds = new Set<string>();

describe("GET /api/v1/branches", () => {
  it("returns the seeded 'Principal' branch when called by OWNER", async () => {
    const owner = await loginAsOwner();
    const { status, body } = await apiFetch<BranchEnvelope>("/api/v1/branches", {
      bearer: owner.accessToken,
    });

    expect(status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    const branches = body.data as BranchDto[];
    expect(branches.length).toBeGreaterThan(0);
    expect(branches.some((b) => b.slug === "principal")).toBe(true);
  });

  it("is allowed for SUCURSAL_USER (read access not gated by OWNER-only)", async () => {
    const branchUser = await loginAsBranchUser();
    const { status, body } = await apiFetch<BranchEnvelope>("/api/v1/branches", {
      bearer: branchUser.accessToken,
    });

    expect(status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
  });
});

describe("POST /api/v1/branches (OWNER only)", () => {
  it("creates a branch with status 201 and matching slug", async () => {
    const owner = await loginAsOwner();
    const { status, body } = await apiFetch<BranchEnvelope>("/api/v1/branches", {
      method: "POST",
      bearer: owner.accessToken,
      body: JSON.stringify({ name: "Test Norte", slug: "test-norte" }),
    });

    expect(status).toBe(201);
    const created = body.data as BranchDto;
    expect(created.slug).toBe("test-norte");
    expect(created.name).toBe("Test Norte");
    expect(typeof created.id).toBe("string");
    createdBranchIds.add(created.id);
  });

  it("returns 409 CONFLICT when creating a duplicate slug", async () => {
    const owner = await loginAsOwner();
    const { status, body } = await apiFetch<BranchEnvelope>("/api/v1/branches", {
      method: "POST",
      bearer: owner.accessToken,
      body: JSON.stringify({ name: "Test Norte 2", slug: "test-norte" }),
    });

    expect(status).toBe(409);
    expect(body.error?.code).toBe("CONFLICT");
  });

  it("forbids creation for SUCURSAL_USER (403 FORBIDDEN)", async () => {
    const branchUser = await loginAsBranchUser();
    const { status, body } = await apiFetch<BranchEnvelope>("/api/v1/branches", {
      method: "POST",
      bearer: branchUser.accessToken,
      body: JSON.stringify({ name: "Branch User Branch", slug: "denied-branch" }),
    });

    expect(status).toBe(403);
    expect(body.error?.code).toBe("FORBIDDEN");
  });
});

describe("DELETE /api/v1/branches/:id", () => {
  it("deletes an OWNER-created empty branch with status 204", async () => {
    const owner = await loginAsOwner();

    // Self-contained: create a branch to delete in this test.
    const createRes = await apiFetch<BranchEnvelope>("/api/v1/branches", {
      method: "POST",
      bearer: owner.accessToken,
      body: JSON.stringify({ name: "Delete Me", slug: "delete-me" }),
    });
    expect(createRes.status).toBe(201);
    const branch = createRes.body.data as BranchDto;
    createdBranchIds.add(branch.id);

    const { status } = await apiFetch(`/api/v1/branches/${branch.id}`, {
      method: "DELETE",
      bearer: owner.accessToken,
    });
    expect(status).toBe(204);
    createdBranchIds.delete(branch.id);
  });
});

describe("POST/DELETE /api/v1/branches/active (OWNER cookie)", () => {
  it("sets + clears the active_branch_id cookie", async () => {
    const owner = await loginAsOwner();

    // Look up the seeded 'principal' branch id.
    const list = await apiFetch<BranchEnvelope>("/api/v1/branches", {
      bearer: owner.accessToken,
    });
    expect(list.status).toBe(200);
    const principal = (list.body.data as BranchDto[]).find(
      (b) => b.slug === "principal"
    );
    expect(principal).toBeDefined();

    // Use raw fetch so we can inspect the Set-Cookie header.
    const setRes = await fetch(`${TEST_BASE_URL}/api/v1/branches/active`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${owner.accessToken}`,
      },
      body: JSON.stringify({ branchId: principal!.id }),
    });
    expect(setRes.status).toBe(204);
    const setCookie = setRes.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("active_branch_id");
    expect(setCookie.toLowerCase()).toContain("httponly");

    const clearRes = await fetch(`${TEST_BASE_URL}/api/v1/branches/active`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${owner.accessToken}` },
    });
    expect(clearRes.status).toBe(204);
  });
});

afterAll(async () => {
  if (createdBranchIds.size === 0) return;
  // Best-effort cleanup so the test DB does not accrete fixture data.
  try {
    const owner = await loginAsOwner();
    for (const id of createdBranchIds) {
      await apiFetch(`/api/v1/branches/${id}`, {
        method: "DELETE",
        bearer: owner.accessToken,
      });
    }
  } catch {
    // Don't fail the whole suite if cleanup can't reach the server.
  }
});
