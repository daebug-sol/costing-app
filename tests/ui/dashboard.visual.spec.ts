import { expect, test } from "@playwright/test";

/**
 * Visual / smoke spec for the Dashboard route ("/").
 *
 * Locks down compact IA: hero KPIs, tabbed insight panel, detail accordion.
 * Chart pixels are masked; table fallbacks verified via detail sheet or tabs.
 */

test.describe("Dashboard ('/')", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Dashboard" })
    ).toBeVisible();
  });

  test("renders heading, tabs, and primary regions", async ({ page }) => {
    await expect(
      page.getByText(/Ringkasan finansial proyek dan quotation/)
    ).toBeVisible();

    await expect(page.getByRole("button", { name: "Refresh" })).toBeVisible();

    await expect(page.getByRole("heading", { level: 2, name: "Insight utama" })).toBeVisible();
    await expect(page.getByTestId("dashboard-tab-finansial")).toBeVisible();
    await expect(page.getByTestId("dashboard-tab-penjualan")).toBeVisible();
    await expect(page.getByTestId("dashboard-tab-costing")).toBeVisible();

    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Profit bridge", { exact: true })).toBeVisible();
    await expect(page.getByText("Cashflow timeline", { exact: true })).toBeVisible();
    await expect(page.getByTestId("profit-bridge-chart")).toBeVisible();
    await expect(page.getByTestId("cashflow-timeline-chart")).toBeVisible();

    await page.getByTestId("dashboard-tab-penjualan").click();
    await expect(page.getByTestId("quotation-funnel")).toBeVisible();
    await expect(page.getByTestId("status-distribution")).toBeVisible();
    await expect(page.getByTestId("sales-leaderboard")).toBeVisible();

    await page.getByTestId("dashboard-tab-costing").click();
    await expect(page.getByTestId("cost-breakdown-chart")).toBeVisible();
    await expect(page.getByTestId("revenue-trend-chart")).toBeVisible();
  });

  test("profit bridge table fallback in detail sheet", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    await expect(page.getByTestId("profit-bridge-chart")).toBeVisible({ timeout: 15_000 });
    const detailButton = page.getByRole("button", { name: "Lihat detail" }).first();
    await expect(detailButton).toBeVisible({ timeout: 10_000 });
    await detailButton.click();
    await expect(page.getByRole("columnheader", { name: "Tahap" })).toBeVisible();
  });

  test("detail accordion exposes quotation aging", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    await page.getByTestId("dashboard-detail-accordion").getByRole("button").click();
    await expect(page.getByTestId("quotation-aging-table")).toBeVisible();
  });

  test("renders new KPI strips", async ({ page }) => {
    const heroLabels = [
      "Booked revenue YTD",
      "Booked revenue MTD",
      "Weighted gross margin",
      "Pipeline value",
      "Discount leakage",
    ];
    const secondaryLabels = ["Total proyek", "Quotation pending", "Win rate", "Eksposur pajak (PPN + PPh)"];

    const heroGrid = page.getByTestId("dashboard-hero-kpis");

    for (const label of heroLabels) {
      await expect(heroGrid.getByText(label, { exact: true })).toBeVisible();
    }

    const viewport = page.viewportSize();
    if (viewport && viewport.width >= 640) {
      const secondaryGrid = page.getByTestId("dashboard-secondary-kpis");
      for (const label of secondaryLabels) {
        await expect(secondaryGrid.getByText(label, { exact: true })).toBeVisible();
      }
    }
  });

  test("matches visual baseline (shell only)", async ({ page }) => {
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveScreenshot("dashboard-shell.png", {
      fullPage: true,
      mask: [
        page.locator(".tabular-money"),
        page.locator("[data-testid='profit-bridge-chart']"),
        page.locator("[data-testid='cost-breakdown-chart']"),
        page.locator("[data-testid='cashflow-timeline-chart']"),
        page.locator("[data-volatile]"),
      ],
      animations: "disabled",
    });
  });
});
