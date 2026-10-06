import { expect, test } from "@playwright/test";

test.describe("Documentation ('/documentation')", () => {
  test("renders quotation list heading", async ({ page }) => {
    await page.goto("/documentation");
    await expect(page.getByRole("heading", { level: 1, name: "Penawaran" })).toBeVisible();
    await expect(
      page.getByText("Folder per pelanggan", { exact: false })
    ).toBeVisible();
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

  test("editor opens with form, preview and export dialog", async ({ page, request }) => {
    await page.goto("/documentation");
    const created = page.waitForResponse(
      (r) => r.url().endsWith("/api/quotations") && r.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Buat penawaran" }).first().click();
    const { id } = (await (await created).json()) as { id: string };

    try {
      await expect(page.getByRole("heading", { level: 1, name: "Editor penawaran" })).toBeAttached({
        timeout: 30_000,
      });
      await expect(page.getByLabel("Nama penawaran")).toBeVisible();
      await expect(page.getByRole("button", { name: "Simpan" })).toBeVisible();

      await page.getByRole("button", { name: /Export PDF/ }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
    } finally {
      // Keep the shared list baseline deterministic: remove the quotation this test created.
      await request.delete(`/api/quotations/${id}`);
    }
  });
});
