import { expect, test } from "@playwright/test";

test.describe("Database ('/database')", () => {
  test("renders heading and supporting copy", async ({ page }) => {
    await page.goto("/database");
    await expect(page.getByRole("heading", { level: 1, name: "Database" })).toBeVisible();
    await expect(
      page.getByText("Basis data AHU terstruktur dan custom dynamic grid untuk kebutuhan costing.", {
        exact: true,
      })
    ).toBeVisible();
  });

  test("matches visual baseline (database shell)", async ({ page }) => {
    await page.goto("/database");
    await expect(page.getByRole("heading", { level: 1, name: "Database" })).toBeVisible();
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveScreenshot("database-shell.png", {
      fullPage: true,
      mask: [page.locator(".tabular-money"), page.locator("[data-volatile]")],
      animations: "disabled",
    });
  });
});
