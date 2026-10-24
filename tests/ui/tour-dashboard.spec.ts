import { expect, test, type Page } from "@playwright/test";
import {
  card,
  expectCardClearOfTarget,
  expectHighlighted,
  expectNoHorizontalScroll,
  shot,
  sizesFor,
} from "./tour-helpers";

/** A follow-up row so the last step always has something to open, whatever the seed holds. */
const FOLLOW_UP = {
  id: "tour-inv",
  kind: "invoice-overdue",
  ref: "INV-TOUR",
  party: "PT Latihan",
  dueLabel: "overdue",
  overdueDays: 2,
};

/**
 * Serve the real dashboard with the viewer's own scope and a chosen follow-up
 * list, and accept target saves without writing to the shared test database
 * (the visual baselines depend on the seeded target).
 */
async function stub(page: Page, followUps: unknown[]) {
  await page.route("**/api/dashboard*", async (route) => {
    const res = await route.fetch();
    const json = await res.json();
    json.personal.followUps = followUps;
    json.personal.followUpTotal = followUps.length;
    json.scope = { ...json.scope, mode: "own" };
    await route.fulfill({ response: res, json });
  });
  await page.route("**/api/me/target", (route) =>
    route.fulfill({ status: 200, json: { ok: true } })
  );
}

async function step(page: Page, n: number, target: string) {
  // The first card waits for the dev server's first compile of the dashboard.
  await expect(card(page)).toContainText(`${n} / 5`, { timeout: n === 1 ? 60_000 : undefined });
  // The engine scrolls the target into view (smoothly), so let the position settle.
  await expect(async () => {
    await expectHighlighted(page, target);
    await expectCardClearOfTarget(page, target);
  }).toPass();
  await expectNoHorizontalScroll(page);
}

/** Lanjut through the two info steps and wait until the target step has settled. */
async function toTargetStep(page: Page) {
  await step(page, 1, "dashboard.greeting");
  await card(page).getByRole("button", { name: "Lanjut" }).click();
  await step(page, 2, "dashboard.kpi");
  await card(page).getByRole("button", { name: "Lanjut" }).click();
  await step(page, 3, "dashboard.target");
}

test.describe("dashboard tutorial", () => {
  // Saving a target refetches the dashboard; let a fetch still in flight end quietly.
  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: "ignoreErrors" });
  });

  for (const scheme of ["light", "dark"] as const) {
    test(`runs to the end by doing each action (${scheme})`, async ({ page }, testInfo) => {
      await stub(page, [FOLLOW_UP]);
      for (const size of sizesFor(testInfo.project.name)) {
        await page.setViewportSize(size);
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto("/?tour=dashboard");
        const name = (i: number) => `dashboard-${i}-${scheme}-${size.width}`;

        await step(page, 1, "dashboard.greeting");
        await shot(page, name(1));
        await card(page).getByRole("button", { name: "Lanjut" }).click();

        await step(page, 2, "dashboard.kpi");
        await card(page).getByRole("button", { name: "Lanjut" }).click();

        await step(page, 3, "dashboard.target");
        // Action steps offer Lewati only; the highlighted button moves the tour on.
        await expect(card(page).getByRole("button")).toHaveCount(1);
        await shot(page, name(3));
        await page
          .locator('[data-tour="dashboard.target"]')
          .getByRole("button", { name: /Atur target|Ubah target/ })
          .click();

        await step(page, 4, "dashboard.target-dialog");
        await shot(page, name(4));
        const dialog = page.getByRole("dialog", { name: "Target bulanan" });
        await dialog.getByLabel("Target per bulan (Rp)").fill("450000000");
        await dialog.getByRole("button", { name: "Simpan" }).click();
        await expect(dialog).toHaveCount(0);

        await step(page, 5, "dashboard.follow-up");
        await shot(page, name(5));
        await page.locator('[data-tour="dashboard.follow-up"]').getByRole("link").first().click();
        await expect(card(page)).toHaveCount(0);
        await expect(page).toHaveURL(/\/invoices\?id=tour-inv$/);
      }
    });
  }

  test("finishes without a follow-up step when there are none", async ({ page }, testInfo) => {
    await stub(page, []);
    await page.setViewportSize(sizesFor(testInfo.project.name)[0]);
    await page.goto("/?tour=dashboard");
    await toTargetStep(page);
    await page
      .locator('[data-tour="dashboard.target"]')
      .getByRole("button", { name: /Atur target|Ubah target/ })
      .click();
    const dialog = page.getByRole("dialog", { name: "Target bulanan" });
    await dialog.getByLabel("Target per bulan (Rp)").fill("450000000");
    await dialog.getByRole("button", { name: "Simpan" }).click();
    // The follow-up list is not rendered, so the engine closes the tour after its grace period.
    await expect(card(page)).toHaveCount(0, { timeout: 6_000 });
    await expect(page).toHaveURL(/\/\?tour=dashboard$/);
  });

  test("Esc in the target dialog closes the dialog, not the tour", async ({ page }, testInfo) => {
    await stub(page, [FOLLOW_UP]);
    await page.setViewportSize(sizesFor(testInfo.project.name)[0]);
    await page.goto("/?tour=dashboard");
    await toTargetStep(page);
    await page
      .locator('[data-tour="dashboard.target"]')
      .getByRole("button", { name: /Atur target|Ubah target/ })
      .click();
    await expect(card(page)).toContainText("4 / 5");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Target bulanan" })).toHaveCount(0);
    await expect(card(page)).toBeVisible();
  });

  test("Lewati closes the tutorial", async ({ page }) => {
    await stub(page, [FOLLOW_UP]);
    await page.goto("/?tour=dashboard");
    await expect(card(page)).toContainText("1 / 5");
    await card(page).getByRole("button", { name: "Lewati" }).click();
    await expect(card(page)).toHaveCount(0);
  });
});
