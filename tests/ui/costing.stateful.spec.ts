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
});
