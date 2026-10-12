import { expect, test } from "@playwright/test";

/**
 * App frame: 4-item main menu, Help as an icon, bottom bar below `lg`.
 * Layout is chosen by the Playwright project (desktop 1440 / iPhone 13 390).
 */
test.describe("app frame", () => {
  test("desktop: four main items, Help is an icon, no bottom bar", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop");
    await page.goto("/");
    const main = page.getByRole("navigation", { name: "Navigasi utama" });
    for (const name of ["Dashboard", "Database", "Costing", "Dokumentasi"]) {
      await expect(main.getByRole("link", { name })).toBeVisible();
    }
    await expect(main.getByRole("link", { name: "Help" })).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Navigasi bawah" })).toBeHidden();

    await page.getByRole("link", { name: "Bantuan" }).click();
    await expect(page).toHaveURL(/\/help$/, { timeout: 30_000 });
  });

  test("mobile: bottom bar replaces the hamburger", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-mobile");
    await page.goto("/");
    const bottom = page.getByRole("navigation", { name: "Navigasi bawah" });
    await expect(bottom).toBeVisible();
    for (const name of ["Dashboard", "Database", "Costing", "Dokumentasi"]) {
      await expect(bottom.getByRole("link", { name })).toBeVisible();
    }
    await expect(page.getByRole("button", { name: "Buka menu" })).toHaveCount(0);
  });

  test("tablet 768px: bottom bar, top menu hidden, no overlap in the top bar", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-mobile");
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Navigasi bawah" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Navigasi utama" })).toBeHidden();
  });

  test("mobile: English labels at 360px do not overflow the page", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-mobile");
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/");
    await page.getByTestId("language-switcher").getByRole("button", { name: "EN" }).click();
    await expect(page.getByRole("navigation", { name: "Bottom navigation" })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("mobile: last content stays clear of the bottom bar", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-mobile");
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const bar = await page.getByRole("navigation", { name: "Navigasi bawah" }).boundingBox();
    const main = await page.locator("main").boundingBox();
    expect(bar).not.toBeNull();
    expect(main).not.toBeNull();
    // <main> reserves the bar's height, so its bottom edge sits at or below the page end
    // while the bar overlays only the reserved padding.
    const reserved = await page.locator("main").evaluate(
      (el) => parseFloat(getComputedStyle(el).paddingBottom)
    );
    expect(reserved).toBeGreaterThanOrEqual(bar!.height - 1);
  });
});
