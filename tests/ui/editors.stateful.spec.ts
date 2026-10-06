import { expect, test } from "@playwright/test";

/**
 * Tests that create and delete rows in the shared database. They run in the `stateful`
 * project (after the visual projects finish) so they cannot change what baselines capture.
 */
test.describe("Stateful editors", () => {
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

  test("custom database grid opens with context menu and add-column dialog", async ({ page, request }) => {
    const name = `E2E grid ${Date.now()}`;
    const res = await request.post("/api/custom-db", { data: { name } });
    expect(res.ok()).toBeTruthy();
    const { id } = (await res.json()) as { id: string };

    try {
      await page.goto("/database");
      await page.waitForLoadState("networkidle");
      await page.getByRole("tab", { name: "Database kustom" }).click();
      // Rows open on Enter (same handler as double-click); keyboard is reliable after hydration.
      const row = page.getByRole("row", { name: new RegExp(name) });
      await row.focus();
      await page.keyboard.press("Enter");

      const header = page.getByRole("columnheader", { name: "Name", exact: true });
      await expect(header).toBeVisible({ timeout: 30_000 });

      await header.click({ button: "right" });
      await page.getByRole("button", { name: "Tambah kolom" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
    } finally {
      await request.delete(`/api/custom-db/${id}`);
    }
  });
});
