/**
 * Web branch switcher — OWNER multi-branch flow + SUCURSAL_USER disabled state.
 *
 * The `BranchSwitcher` component renders a static label when there is only one
 * branch (or when `disabled` is true). With a fresh seed there is only the
 * "Principal" branch, so the multi-branch dropdown test creates a second one
 * via the REST API, switches via the UI, and cleans up in `afterAll`.
 */
import { test, expect, type Page } from "@playwright/test";
import { apiFetch, loginAsOwner } from "../_helpers/auth";

const OWNER = {
  email: "owner@system.com",
  password: "Admin1234!",
} as const;

const BRANCH_USER = {
  email: "user@system.com",
  password: "User1234!",
} as const;

const TEST_BRANCH_SLUG = `qa-branch-${Date.now()}`;
const TEST_BRANCH_NAME = `QA Branch ${Date.now()}`;

interface BranchDto {
  id: string;
  name: string;
  slug: string;
}

interface Envelope<T> {
  data?: T;
  error?: { code: string; message: string };
}

async function loginViaUi(
  page: Page,
  credentials: { email: string; password: string }
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(credentials.email);
  await page.getByLabel("Contraseña").fill(credentials.password);
  await page.getByRole("button", { name: /ingresar/i }).click();
  await page.waitForURL("**/calendario", { timeout: 15_000 });
}

test.describe("Branch switcher", () => {
  test("OWNER sees the active branch in the sidebar header (single-branch case)", async ({
    page,
  }) => {
    await loginViaUi(page, OWNER);

    // With a single seeded branch, the switcher renders as a static label.
    // Just assert "Principal" is visible in the header chrome.
    await expect(page.getByText("Principal").first()).toBeVisible();
  });

  test.describe("OWNER multi-branch flow", () => {
    let ownerToken: string;
    let createdBranchId: string | null = null;

    test.beforeAll(async () => {
      const owner = await loginAsOwner();
      ownerToken = owner.accessToken;

      const created = await apiFetch<Envelope<BranchDto>>("/api/v1/branches", {
        method: "POST",
        bearer: ownerToken,
        body: JSON.stringify({
          name: TEST_BRANCH_NAME,
          slug: TEST_BRANCH_SLUG,
        }),
      });
      if (created.status !== 201 || !created.body.data) {
        throw new Error(
          `Failed to seed test branch (status ${created.status}): ${
            created.body.error?.message ?? "no body"
          }`
        );
      }
      createdBranchId = created.body.data.id;
    });

    test.afterAll(async () => {
      if (createdBranchId) {
        // Best-effort cleanup — branch deletion is blocked if anything depends on it.
        await apiFetch(`/api/v1/branches/${createdBranchId}`, {
          method: "DELETE",
          bearer: ownerToken,
        }).catch(() => undefined);
      }
    });

    test("OWNER can switch to the second branch via the sidebar dropdown", async ({
      page,
    }) => {
      await loginViaUi(page, OWNER);

      // Sidebar switcher is now a dropdown trigger because branches.length > 1.
      // The trigger contains the active branch name.
      const switcherTrigger = page
        .locator('[data-slot="sidebar-menu-button"]')
        .filter({ hasText: "Principal" })
        .first();
      await expect(switcherTrigger).toBeVisible();
      await switcherTrigger.click();

      // The dropdown menu lists every branch — click our test branch.
      await page
        .getByRole("menuitem", { name: TEST_BRANCH_NAME })
        .click();

      // After switch + router.refresh(), the sidebar header now shows the new branch.
      await expect(
        page.getByText(TEST_BRANCH_NAME).first()
      ).toBeVisible({ timeout: 15_000 });
    });
  });

  test("SUCURSAL_USER sees the branch as a static (non-interactive) label", async ({
    page,
  }) => {
    await loginViaUi(page, BRANCH_USER);

    // The sidebar header shows "Principal" but it's NOT a dropdown trigger —
    // it's wrapped as a plain SidebarMenuButton. Clicking it must not open a menu.
    const principalLabel = page.getByText("Principal").first();
    await expect(principalLabel).toBeVisible();

    // No dropdown menu items should appear for the branch switcher.
    // (Other dropdowns like nav-user exist, so we don't assert no menus globally —
    //  we only check the switcher header itself isn't a popover trigger.)
    const switcherButton = page
      .locator('[data-slot="sidebar-menu-button"]')
      .filter({ hasText: "Principal" })
      .first();
    const hasPopupAttr = await switcherButton.getAttribute("aria-haspopup");
    // Static label has no aria-haspopup (or is "false"); dropdown trigger has "menu".
    expect(hasPopupAttr === null || hasPopupAttr === "false").toBe(true);
  });
});
