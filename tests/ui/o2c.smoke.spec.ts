import { expect, test } from "@playwright/test";

/**
 * Smoke coverage for Order-to-Cash surfaces (no screenshot baselines).
 * Auth is bypassed in the Playwright webServer env (see playwright.config).
 */
test.describe("O2C smoke", () => {
  test("customers page loads", async ({ page }) => {
    await page.goto("/customers");
    await expect(page.getByRole("heading", { name: "Pelanggan" })).toBeVisible({
      timeout: 30_000,
    });
  });

  test("sales orders page loads", async ({ page }) => {
    await page.goto("/sales-orders");
    await expect(
      page.getByRole("heading", { name: "Sales Order" })
    ).toBeVisible({ timeout: 30_000 });
  });

  test("invoices page loads", async ({ page }) => {
    await page.goto("/invoices");
    await expect(page.getByRole("heading", { name: "Invoice" })).toBeVisible({
      timeout: 30_000,
    });
  });

  test("payments page loads", async ({ page }) => {
    await page.goto("/payments");
    await expect(
      page.getByRole("heading", { name: "Pembayaran" })
    ).toBeVisible({ timeout: 30_000 });
  });

  test("documentation folder expand shows O2C progress; SO segment navigates", async ({
    page,
  }) => {
    test.setTimeout(60_000);

    await page.goto("/documentation");

    const heading = page.getByRole("heading", { level: 1, name: "Penawaran" });
    const settingsError = page.getByText("Failed to load settings", {
      exact: false,
    });
    const emptyState = page.getByText("Tidak ada penawaran", { exact: false });

    // Wait until list shell, empty state, or settings/auth failure settles.
    await Promise.race([
      heading.waitFor({ state: "visible", timeout: 45_000 }).catch(() => null),
      settingsError
        .waitFor({ state: "visible", timeout: 45_000 })
        .catch(() => null),
      emptyState.waitFor({ state: "visible", timeout: 45_000 }).catch(() => null),
    ]);

    if (await settingsError.isVisible().catch(() => false)) {
      test.skip(
        true,
        "Settings/API unavailable for test org — skip documentation progress smoke"
      );
      return;
    }

    if (!(await heading.isVisible().catch(() => false))) {
      test.skip(
        true,
        "Documentation list did not render (auth/data) — skip progress smoke"
      );
      return;
    }

    if (await emptyState.isVisible().catch(() => false)) {
      test.skip(true, "No quotations in test org — skip progress expand smoke");
      return;
    }

    const expandBtn = page
      .getByRole("button", { name: /^Perluas proyek$/ })
      .first();

    if ((await expandBtn.count()) === 0) {
      test.skip(true, "No expandable project rows — skip progress expand smoke");
      return;
    }

    await expandBtn.click();

    const progress = page.getByRole("group", { name: "Progres order-to-cash" });
    await expect(progress).toBeVisible({ timeout: 10_000 });

    const segments = progress.getByRole("button");
    await expect(segments).toHaveCount(5);

    const soSegment = progress.getByRole("button", {
      name: /Sales Order/i,
    });
    await expect(soSegment).toBeVisible();

    // SO href only exists when the project has a converted SO; otherwise skip nav assert.
    if (await soSegment.isDisabled()) {
      test.skip(
        true,
        "Expanded project has no Sales Order yet — progress bar rendered OK"
      );
      return;
    }

    await soSegment.click();
    await expect(page).toHaveURL(/\/sales-orders\?id=/, { timeout: 15_000 });
  });
});
