import { expect, test } from "@playwright/test";

/**
 * Visual / smoke spec for the Dashboard route ("/").
 *
 * Locks down compact IA: hero KPIs, tabbed insight panel, penjualan detail blocks.
 * Chart pixels are masked; table fallbacks verified via detail sheet or tabs.
 */

/**
 * Charts only mount with data; on a freshly seeded database each insight block shows
 * its empty state instead. Either outcome proves the block rendered (not still loading).
 */
const EMPTY_STATE = /Belum ada/;

test.describe("Dashboard ('/')", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Dashboard" })
    ).toBeVisible();
    // Wait for KPI skeletons to resolve (first dev-server compile can be slow).
    await expect(
      page.getByTestId("dashboard-hero-kpis").getByText("Pendapatan booked YTD", { exact: true })
    ).toBeVisible({ timeout: 60_000 });
  });

  test("renders heading, tabs, and primary regions", async ({ page }) => {
    await expect(
      page.getByText(/Ringkasan finansial proyek dan quotation/)
    ).toBeVisible();

    await expect(page.getByRole("button", { name: "Muat ulang" })).toBeVisible();

    await expect(page.getByRole("heading", { level: 2, name: "Insight utama" })).toBeVisible();
    await expect(page.getByTestId("dashboard-tab-finansial")).toBeVisible();
    await expect(page.getByTestId("dashboard-tab-penjualan")).toBeVisible();
    await expect(page.getByTestId("dashboard-tab-costing")).toBeVisible();

    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Profit bridge", { exact: true })).toBeVisible();
    await expect(page.getByText("Cashflow timeline", { exact: true })).toBeVisible();
    await expect(
      page.getByTestId("profit-bridge-chart").or(page.getByText(EMPTY_STATE)).first()
    ).toBeVisible();
    await expect(
      page.getByTestId("cashflow-timeline-chart").or(page.getByText(EMPTY_STATE)).first()
    ).toBeVisible();

    await page.getByTestId("dashboard-tab-penjualan").click();
    for (const id of ["quotation-funnel", "status-distribution", "sales-leaderboard"]) {
      await expect(page.getByTestId(id).or(page.getByText(EMPTY_STATE)).first()).toBeVisible();
    }

    await page.getByTestId("dashboard-tab-costing").click();
    for (const id of ["cost-breakdown-chart", "revenue-trend-chart"]) {
      await expect(page.getByTestId(id).or(page.getByText(EMPTY_STATE)).first()).toBeVisible();
    }
  });

  test("profit bridge table fallback in detail sheet", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    const bridge = page.getByTestId("profit-bridge-chart");
    test.skip(!(await bridge.isVisible()), "needs seeded revenue data (profit bridge is empty)");
    const detailButton = page.getByRole("button", { name: "Lihat detail" }).first();
    await expect(detailButton).toBeVisible({ timeout: 10_000 });
    await detailButton.click();
    await expect(page.getByRole("columnheader", { name: "Tahap" })).toBeVisible();
  });

  test("penjualan tab exposes quotation aging", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    await page.getByTestId("dashboard-tab-penjualan").click();
    await expect(
      page.getByTestId("quotation-aging-table").or(page.getByText(EMPTY_STATE)).first()
    ).toBeVisible();
  });

  test("renders new KPI strips", async ({ page }) => {
    const heroLabels = [
      "Pendapatan booked YTD",
      "Pendapatan booked MTD",
      "Margin kotor tertimbang",
      "Nilai pipeline",
      "Kebocoran diskon",
    ];
    const secondaryLabels = ["Total proyek", "Quotation pending", "Win rate", "Eksposur pajak (PPN + PPh)"];

    const heroGrid = page.getByTestId("dashboard-hero-kpis");

    for (const label of heroLabels) {
      await expect(heroGrid.getByText(label, { exact: true })).toBeVisible();
    }

    const secondaryGrid = page.getByTestId("dashboard-secondary-kpis");
    for (const label of secondaryLabels) {
      await expect(secondaryGrid.getByText(label, { exact: true })).toBeVisible();
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
