import { expect, test } from "@playwright/test";

test.describe("Documentation ('/documentation')", () => {
  test("renders quotation list heading", async ({ page }) => {
    await page.goto("/documentation");
    await expect(page.getByRole("heading", { level: 1, name: "Penawaran" })).toBeVisible();
    await expect(page.getByText("Daftar dokumen penawaran", { exact: false })).toBeVisible();
  });

  test("matches visual baseline (documentation shell)", async ({ page }) => {
    await page.goto("/documentation");
    await expect(page.getByRole("heading", { level: 1, name: "Penawaran" })).toBeVisible();
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveScreenshot("documentation-shell.png", {
      fullPage: true,
      mask: [page.locator(".tabular-money"), page.locator("[data-volatile]")],
      animations: "disabled",
    });
  });
});
