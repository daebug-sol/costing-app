import { expect, test } from "@playwright/test";

test.describe("Costing ('/costing')", () => {
  test("renders heading and sidebar actions", async ({ page }) => {
    await page.goto("/costing");
    await expect(page.getByRole("heading", { level: 1, name: "Costing" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Costing Projects" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Tambah proyek" })).toBeVisible();
  });

  test("matches visual baseline (workspace shell)", async ({ page }) => {
    await page.goto("/costing");
    await expect(page.getByRole("heading", { level: 1, name: "Costing" })).toBeVisible();
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveScreenshot("costing-shell.png", {
      fullPage: true,
      mask: [page.locator(".tabular-money"), page.locator("[data-volatile]")],
      animations: "disabled",
    });
  });
});
