import { expect, test } from "@playwright/test";

/** Creates and deletes a project in the shared test org (runs in the `stateful` project). */
test.describe("Costing project navigation", () => {
  test("list row opens the project and the breadcrumb returns to the list", async ({ page, request }) => {
    const name = `E2E costing ${Date.now()}`;
    const res = await request.post("/api/projects", { data: { name } });
    expect(res.ok()).toBeTruthy();
    const { id } = (await res.json()) as { id: string };

    try {
      await page.goto("/costing");
      await page.getByRole("link", { name: new RegExp(name) }).click();
      await expect(page).toHaveURL(new RegExp(`\\?project=${id}`));
      await expect(page.getByRole("heading", { name })).toBeVisible();

      await page.getByRole("link", { name: "Semua proyek" }).click();
      await expect(page).toHaveURL(/\/costing$/);
      await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible();
    } finally {
      await request.delete(`/api/projects/${id}`);
    }
  });

  test("dashboard-style deep link opens the project directly", async ({ page, request }) => {
    const name = `E2E deeplink ${Date.now()}`;
    const res = await request.post("/api/projects", { data: { name } });
    const { id } = (await res.json()) as { id: string };
    try {
      await page.goto(`/costing?project=${encodeURIComponent(id)}`);
      await expect(page.getByRole("heading", { name })).toBeVisible();
    } finally {
      await request.delete(`/api/projects/${id}`);
    }
  });

  test("project page: empty state, add item, price bar and finalize dialog", async ({ page, request }) => {
    const name = `E2E page ${Date.now()}`;
    const res = await request.post("/api/projects", { data: { name } });
    const { id } = (await res.json()) as { id: string };
    try {
      await page.goto(`/costing?project=${encodeURIComponent(id)}`);
      await expect(page.getByRole("heading", { name })).toBeVisible();
      await expect(page.getByText("Belum ada item")).toBeVisible();

      const bar = page.getByText("Harga jual").first();
      await expect(bar).toBeVisible();
      await expect(page.getByText("Total biaya").first()).toBeVisible();
      await expect(page.getByText("Per unit").first()).toBeVisible();

      await page.getByRole("button", { name: "Single Item" }).click();
      await expect(page.getByRole("button", { name: "Tambah item" })).toBeVisible();
      await expect(page.getByText("Belum ada item")).toHaveCount(0);

      await page.getByRole("button", { name: "Finalkan" }).first().click();
      const dialog = page.getByRole("alertdialog");
      await expect(dialog).toContainText("Anda tetap bisa mengembalikannya ke draft");
      await dialog.getByRole("button", { name: "Finalkan", exact: true }).click();
      await expect(page.getByRole("button", { name: "Kembalikan ke draft" })).toBeVisible();
    } finally {
      await request.delete(`/api/projects/${id}`);
    }
  });

  test("project page: price bar stays visible and nothing overflows at 390px", async ({ page, request }) => {
    const name = `E2E mobile ${Date.now()}`;
    const res = await request.post("/api/projects", { data: { name } });
    const { id } = (await res.json()) as { id: string };
    try {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`/costing?project=${encodeURIComponent(id)}`);
      await expect(page.getByRole("heading", { name })).toBeVisible();
      await page.mouse.wheel(0, 600);
      await expect(page.getByText("Harga jual").first()).toBeInViewport();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth
      );
      expect(overflow).toBe(true);
    } finally {
      await request.delete(`/api/projects/${id}`);
    }
  });
});
