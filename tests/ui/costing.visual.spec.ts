import { expect, test } from "@playwright/test";

test.describe("Costing ('/costing')", () => {
  test("renders heading, search and filters without opening a menu", async ({ page }) => {
    await page.goto("/costing");
    await expect(page.getByRole("heading", { level: 1, name: "Costing" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Proyek costing" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Proyek baru" }).first()).toBeVisible();
    await expect(page.getByPlaceholder("Cari nama / model / ID…")).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Status" })).toBeVisible();
  });

  test("unknown project id shows a not-found state with a way back", async ({ page }) => {
    await page.goto("/costing?project=does-not-exist");
    await expect(page.getByText("Proyek tidak ditemukan")).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "Semua proyek" }).click();
    await expect(page).toHaveURL(/\/costing$/);
    await expect(page.getByRole("heading", { name: "Proyek costing" })).toBeVisible();
  });

  test("matches visual baseline (project list)", async ({ page }) => {
    await page.goto("/costing");
    await expect(page.getByRole("heading", { level: 1, name: "Costing" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Proyek baru" }).first()).toBeVisible();
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveScreenshot("costing-list.png", {
      fullPage: true,
      mask: [page.locator(".tabular-money"), page.locator("[data-volatile]")],
      animations: "disabled",
    });
  });
});
