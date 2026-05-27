/**
 * Web auth flows — login (OWNER + SUCURSAL_USER), wrong-password error, logout.
 *
 * Drives the real `/login` page in a browser (cookie-based NextAuth session).
 * Requires a running dev server (`npm run dev`) and a seeded DB:
 *   - OWNER:         owner@system.com / Admin1234!
 *   - SUCURSAL_USER: user@system.com  / User1234!
 */
import { test, expect, type Page } from "@playwright/test";

const OWNER = {
  email: "owner@system.com",
  password: "Admin1234!",
} as const;

const BRANCH_USER = {
  email: "user@system.com",
  password: "User1234!",
} as const;

async function fillLoginForm(
  page: Page,
  credentials: { email: string; password: string }
): Promise<void> {
  await page.getByLabel("Email").fill(credentials.email);
  await page.getByLabel("Contraseña").fill(credentials.password);
  await page.getByRole("button", { name: /ingresar/i }).click();
}

test.describe("Web auth", () => {
  test("OWNER logs in and lands on /calendario", async ({ page }) => {
    await page.goto("/login");
    await fillLoginForm(page, OWNER);

    await page.waitForURL("**/calendario", { timeout: 15_000 });
    await expect(page).toHaveURL(/\/calendario$/);

    // Dashboard chrome — the BranchSwitcher shows "Principal" in the sidebar header.
    await expect(page.getByText("Principal").first()).toBeVisible();
  });

  test("SUCURSAL_USER logs in and lands on /calendario", async ({ page }) => {
    await page.goto("/login");
    await fillLoginForm(page, BRANCH_USER);

    await page.waitForURL("**/calendario", { timeout: 15_000 });
    await expect(page).toHaveURL(/\/calendario$/);

    // SUCURSAL_USER sees the (disabled) Principal label in the sidebar.
    await expect(page.getByText("Principal").first()).toBeVisible();
  });

  test("wrong password stays on /login and shows error toast", async ({
    page,
  }) => {
    await page.goto("/login");
    await fillLoginForm(page, { email: OWNER.email, password: "nope" });

    // Stay on /login (no redirect to /calendario).
    await expect(page).toHaveURL(/\/login$/);

    // Sonner renders a toast — its inner text contains "Credenciales incorrectas".
    await expect(page.getByText("Credenciales incorrectas")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("OWNER can log out from the sidebar", async ({ page }) => {
    // Sign in first.
    await page.goto("/login");
    await fillLoginForm(page, OWNER);
    await page.waitForURL("**/calendario", { timeout: 15_000 });

    // Open the user menu in the sidebar footer. The trigger is a sidebar
    // button that includes the user's email — click it to reveal "Cerrar sesión".
    const userMenuTrigger = page
      .locator('[data-slot="sidebar-menu-button"]')
      .filter({ hasText: OWNER.email })
      .first();
    await userMenuTrigger.click();

    await page.getByRole("menuitem", { name: /cerrar sesi[oó]n/i }).click();

    await page.waitForURL("**/login", { timeout: 15_000 });
    await expect(page).toHaveURL(/\/login$/);
  });
});
