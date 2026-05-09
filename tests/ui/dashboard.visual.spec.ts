import { expect, test } from "@playwright/test";

/**
 * Sample visual / smoke spec for the Dashboard route ("/").
 *
 * What we lock down here (intentionally narrow to keep the harness honest):
 *   1. The route mounts and the canonical <h1> + description appear.
 *   2. The KPI grid renders eight cards (matches DashboardPage cards array).
 *   3. The Hero Sankey card region exists with its title.
 *   4. A full-page screenshot baseline of the loaded shell.
 *
 * What we do NOT test here (out of scope, would be brittle):
 *   - The exact rendering of the Sankey chart (data-driven, masked).
 *   - Live KPI numbers (mask any region that depends on the dev DB).
 *
 * See docs/UI-HARNESS.md §4 and docs/UX-ACCEPTANCE-SCENARIOS.md scenario 1.
 */

test.describe("Dashboard ('/')", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for the canonical heading. This is more reliable than networkidle
    // alone because the dashboard fetches /api/dashboard after mount.
    await expect(
      page.getByRole("heading", { level: 1, name: "Dashboard" })
    ).toBeVisible();
  });

  test("renders heading, description, and primary regions", async ({
    page,
  }) => {
    await expect(
      page.getByText("Ringkasan proyek dan penawaran", { exact: true })
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Hero Sankey Profit Bridge" })
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Revenue Trend" })
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Cashflow Projection" })
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Top Drivers" })
    ).toBeVisible();
  });

  test("renders eight KPI labels", async ({ page }) => {
    const kpiLabels = [
      "Total Projects",
      "Active Costing",
      "Pending Quotation",
      "Approved Quotation",
      "Weighted Gross Margin",
      "Discount Leakage",
      "Booked Revenue MTD (net)",
      "Booked Revenue YTD (net)",
    ];

    for (const label of kpiLabels) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test("matches visual baseline (shell only)", async ({ page }) => {
    // Wait for the dashboard fetch to settle so skeletons are gone.
    await page.waitForLoadState("networkidle");

    // Mask only known volatile regions so the baseline is stable across DB
    // states without hiding unrelated SVG-based UI (icons, glyphs, etc).
    await expect(page).toHaveScreenshot("dashboard-shell.png", {
      fullPage: true,
      mask: [
        page.locator(".tabular-money"),
        page.locator(".nivo-sankey"),
        page.locator("[data-volatile]"),
      ],
      animations: "disabled",
    });
  });
});
