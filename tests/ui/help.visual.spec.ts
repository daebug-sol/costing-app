import { expect, test } from "@playwright/test";

test.describe("Help ('/help')", () => {
  test("renders hub heading and track cards", async ({ page }) => {
    await page.goto("/help");
    await expect(page.getByRole("heading", { level: 1, name: "Help" })).toBeVisible();
    await expect(page.getByTestId("help-hub")).toBeVisible();
    await expect(page.getByTestId("help-search")).toBeVisible();
    await expect(page.getByRole("link", { name: "Mulai dari sini" })).toBeVisible();
    await expect(page.getByText("Mulai cepat", { exact: true })).toBeVisible();
  });

  // Baselines not committed yet — re-enable after `npx playwright test tests/ui/help.visual.spec.ts --update-snapshots`
  test.skip("matches visual baseline (help hub shell)", async ({ page }) => {
    await page.goto("/help");
    await expect(page.getByRole("heading", { level: 1, name: "Help" })).toBeVisible();
    await expect(page.getByTestId("help-hub")).toBeVisible();
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveScreenshot("help-shell.png", {
      fullPage: true,
      mask: [page.locator(".tabular-money"), page.locator("[data-volatile]")],
      animations: "disabled",
    });
  });

  test("opens a lesson and marks complete with persisted progress", async ({
    page,
  }) => {
    await page.goto("/help/mulai-cepat/orientasi-aplikasi");
    await expect(
      page.getByRole("heading", { level: 1, name: "Orientasi aplikasi" })
    ).toBeVisible();
    await expect(page.getByTestId("help-lesson-view")).toBeVisible();

    await page.getByTestId("help-mark-complete").click();
    await expect(page.getByTestId("help-mark-complete")).toHaveText(/Sudah selesai/);

    await page.waitForFunction(() => {
      const raw = window.localStorage.getItem("costing-help-progress");
      if (!raw) return false;
      const parsed = JSON.parse(raw) as { completedLessonKeys?: string[] };
      return parsed.completedLessonKeys?.includes(
        "mulai-cepat/orientasi-aplikasi"
      );
    });

    await page.reload();
    await expect(page.getByTestId("help-mark-complete")).toHaveText(/Sudah selesai/);
  });

  // Baselines not committed yet — re-enable after `npx playwright test tests/ui/help.visual.spec.ts --update-snapshots`
  test.skip("matches visual baseline (help lesson shell)", async ({ page }) => {
    await page.goto("/help/mulai-cepat/orientasi-aplikasi");
    await expect(
      page.getByRole("heading", { level: 1, name: "Orientasi aplikasi" })
    ).toBeVisible();
    await expect(page.getByTestId("help-lesson-view")).toBeVisible();
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveScreenshot("help-lesson-shell.png", {
      fullPage: true,
      mask: [page.locator(".tabular-money"), page.locator("[data-volatile]")],
      animations: "disabled",
    });
  });

  test("Navbar includes Help link", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Help" })).toBeVisible();
  });
});
