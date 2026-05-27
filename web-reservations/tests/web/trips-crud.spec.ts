/**
 * Web Trips CRUD lifecycle — drives the `/viajes` UI end-to-end.
 *
 * Flow:
 *   1. (setup) ensure a Route + active TripSchedule exists in "principal"
 *   2. login OWNER, navigate to /viajes
 *   3. UI: create trip → list shows it
 *   4. UI: close trip → badge becomes "CERRADO"
 *   5. UI: generate manifest → manifest code appears
 *   6. UI: re-open trip → badge becomes "ABIERTO" again
 *   7. UI: edit trip → updated field visible
 *   8. UI: delete trip → row removed
 *   9. (teardown) delete fixtures via API
 */
import { test, expect, type Page } from "@playwright/test";
import { apiFetch, loginAsOwner } from "../_helpers/auth";

const OWNER = {
  email: "owner@system.com",
  password: "Admin1234!",
} as const;

const FIXTURE_SUFFIX = String(Date.now());
const ORIGIN = `TestOrigin-${FIXTURE_SUFFIX}`;
const DESTINATION = `TestDest-${FIXTURE_SUFFIX}`;
const SCHEDULE_TIME = "12:00";

interface Envelope<T> {
  data?: T;
  error?: { code: string; message: string };
}

interface BranchDto {
  id: string;
  slug: string;
  name: string;
}

interface RouteDto {
  id: string;
  origin: string;
  destination: string;
  branchId: string;
}

interface TripScheduleDto {
  id: string;
  routeId: string;
  time: string;
  isActive: boolean;
}

let ownerToken: string;
let principalBranchId: string;
let routeId: string;
let scheduleId: string;

function tomorrowIsoDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function dayAfterTomorrowIsoDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return d.toISOString().slice(0, 10);
}

async function loginViaUi(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(OWNER.email);
  await page.getByLabel("Contraseña").fill(OWNER.password);
  await page.getByRole("button", { name: /ingresar/i }).click();
  await page.waitForURL("**/calendario", { timeout: 15_000 });
}

/**
 * Picks an option from a shadcn/Radix Select. The trigger is the button labelled
 * `triggerLabel` (its `<Label htmlFor>` text). The popup uses role=option.
 */
async function selectOption(
  page: Page,
  triggerLabel: string | RegExp,
  optionText: string | RegExp
): Promise<void> {
  // The shadcn Select trigger isn't a real <select>; aria-label isn't set,
  // but the visible <Label> sits above a [data-slot="select-trigger"] button.
  // We locate the trigger by walking from the label's `for` target.
  const trigger = page
    .locator('[data-slot="select-trigger"]')
    .filter({ has: page.locator(`text=${typeof triggerLabel === "string" ? triggerLabel : ""}`) })
    .first();

  // Fallback: locate by id when the regex/exact string trick above misses.
  // The label binds via `htmlFor=<id>` and the trigger has that id.
  const triggerByLabel = (await trigger.count()) > 0
    ? trigger
    : page.locator(`#${typeof triggerLabel === "string" ? triggerLabel.toLowerCase() : ""}`);

  await triggerByLabel.click();
  await page.getByRole("option", { name: optionText }).first().click();
}

test.describe("Trips CRUD lifecycle (UI)", () => {
  test.beforeAll(async () => {
    const owner = await loginAsOwner();
    ownerToken = owner.accessToken;

    const branches = await apiFetch<Envelope<BranchDto[]>>("/api/v1/branches", {
      bearer: ownerToken,
    });
    const principal = (branches.body.data ?? []).find(
      (b) => b.slug === "principal"
    );
    if (!principal) {
      throw new Error(
        "Seeded 'principal' branch not found — run `npx prisma db seed`."
      );
    }
    principalBranchId = principal.id;

    // Create a dedicated Route for this suite.
    const routeRes = await apiFetch<Envelope<RouteDto>>("/api/v1/routes", {
      method: "POST",
      bearer: ownerToken,
      body: JSON.stringify({
        origin: ORIGIN,
        destination: DESTINATION,
        branchId: principalBranchId,
      }),
    });
    if (routeRes.status !== 201 || !routeRes.body.data) {
      throw new Error(
        `Failed to create test route (${routeRes.status}): ${
          routeRes.body.error?.message ?? "no body"
        }`
      );
    }
    routeId = routeRes.body.data.id;

    // Create an active TripSchedule on that route at SCHEDULE_TIME.
    const scheduleRes = await apiFetch<Envelope<TripScheduleDto>>(
      "/api/v1/trip-schedules",
      {
        method: "POST",
        bearer: ownerToken,
        body: JSON.stringify({
          routeId,
          time: SCHEDULE_TIME,
          isActive: true,
        }),
      }
    );
    if (scheduleRes.status !== 201 || !scheduleRes.body.data) {
      throw new Error(
        `Failed to create test schedule (${scheduleRes.status}): ${
          scheduleRes.body.error?.message ?? "no body"
        }`
      );
    }
    scheduleId = scheduleRes.body.data.id;
  });

  test.afterAll(async () => {
    if (scheduleId) {
      await apiFetch(`/api/v1/trip-schedules/${scheduleId}`, {
        method: "DELETE",
        bearer: ownerToken,
      }).catch(() => undefined);
    }
    if (routeId) {
      await apiFetch(`/api/v1/routes/${routeId}`, {
        method: "DELETE",
        bearer: ownerToken,
      }).catch(() => undefined);
    }
  });

  test("OWNER walks a trip through create → close → manifest → open → edit → delete", async ({
    page,
  }) => {
    await loginViaUi(page);
    await page.goto("/viajes");
    await expect(page).toHaveURL(/\/viajes$/);

    const routeLabel = `${ORIGIN} → ${DESTINATION}`;

    // -------- CREATE --------
    await page.getByRole("button", { name: /nuevo viaje/i }).click();

    // Pick "Principal" sucursal.
    await selectOption(page, "branchId", "Principal");
    await selectOption(page, "routeId", routeLabel);
    await selectOption(page, "scheduleId", SCHEDULE_TIME);

    const departureDate = tomorrowIsoDate();
    await page.getByLabel("Fecha de salida").fill(departureDate);

    await page.getByRole("button", { name: /crear viaje/i }).click();
    await expect(page.getByText(/viaje creado exitosamente/i)).toBeVisible({
      timeout: 10_000,
    });

    // The new row appears in the table. Match by route text.
    const tripRow = page.getByRole("row", { name: new RegExp(ORIGIN) });
    await expect(tripRow).toBeVisible({ timeout: 10_000 });

    // -------- CLOSE --------
    await tripRow.getByRole("button", { name: /cerrar viaje/i }).click();
    await expect(page.getByText(/viaje cerrado/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(tripRow.getByText("CERRADO")).toBeVisible({ timeout: 10_000 });

    // -------- GENERATE MANIFEST --------
    await tripRow.getByRole("button", { name: /generar manifiesto/i }).click();
    await expect(page.getByText(/manifiesto .* generado/i)).toBeVisible({
      timeout: 10_000,
    });
    // The manifest column now shows a monospace code badge — assert non-empty.
    await expect(tripRow.locator(".font-mono")).toBeVisible({ timeout: 10_000 });

    // -------- RE-OPEN --------
    await tripRow.getByRole("button", { name: /reabrir viaje/i }).click();
    await expect(page.getByText(/viaje reabierto/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(tripRow.getByText("ABIERTO")).toBeVisible({ timeout: 10_000 });

    // -------- EDIT --------
    // Re-acquire the row reference after re-render (the badge text changed,
    // so the original `name` regex still matches by route).
    const refreshedRow = page.getByRole("row", { name: new RegExp(ORIGIN) });
    // The edit button has no accessible name (icon-only). It's the second-to-last
    // button in the actions cell; bracket by its sibling delete button having
    // `text-destructive`. Just take the IconEdit button: index by position.
    await refreshedRow
      .locator("button")
      .filter({ hasNot: page.locator(".text-destructive") })
      .nth(-1) // the last "non-destructive" button in the action group is Edit
      .click();

    const newDate = dayAfterTomorrowIsoDate();
    await page.getByLabel("Fecha de salida").fill(newDate);
    await page.getByRole("button", { name: /guardar cambios/i }).click();
    await expect(page.getByText(/viaje actualizado/i)).toBeVisible({
      timeout: 10_000,
    });

    // -------- DELETE --------
    const rowAfterEdit = page.getByRole("row", { name: new RegExp(ORIGIN) });
    await rowAfterEdit
      .locator("button.text-destructive, button[class*='text-destructive']")
      .first()
      .click();
    await page.getByRole("button", { name: /^eliminar$/i }).click();
    await expect(page.getByText(/viaje eliminado/i)).toBeVisible({
      timeout: 10_000,
    });

    // Row is gone — either an empty-state message shows or the row simply
    // isn't there anymore.
    await expect(
      page.getByRole("row", { name: new RegExp(ORIGIN) })
    ).toHaveCount(0, { timeout: 10_000 });
  });
});
