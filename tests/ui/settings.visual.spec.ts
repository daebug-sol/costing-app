import { expect, test } from "@playwright/test";

test.describe("Settings ('/settings')", () => {
  test("renders heading and key cards", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { level: 1, name: "Pengaturan" })).toBeVisible();
    await expect(page.getByText("Profil perusahaan", { exact: true })).toBeVisible();
    await expect(page.getByText("Kurs forex", { exact: true })).toBeVisible();
  });

  test("matches visual baseline (settings shell)", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { level: 1, name: "Pengaturan" })).toBeVisible();
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveScreenshot("settings-shell.png", {
      fullPage: true,
      mask: [page.locator(".tabular-money"), page.locator("[data-volatile]")],
      animations: "disabled",
    });
  });
});
