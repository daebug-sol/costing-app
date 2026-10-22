import { expect, test } from "@playwright/test";

/**
 * Language switching must not depend on API data, so these checks only use
 * chrome that renders even when the backend is unavailable.
 */
test.describe("language switcher", () => {
  test("defaults to Indonesian, switches to English in Settings, and persists", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.locator("html")).toHaveAttribute("lang", "id");
    const toggle = page.getByTestId("locale-toggle");
    await toggle.getByRole("radio", { name: "English" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByTestId("language-switcher")).toHaveCount(0);
  });

  test("settings page exposes the same language choice", async ({ page }) => {
    await page.goto("/settings");
    const toggle = page.getByTestId("locale-toggle");
    await expect(toggle).toBeVisible();
    await toggle.getByRole("radio", { name: "English" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByTestId("theme-settings-card").getByText("Appearance", { exact: true })).toBeVisible();
    await toggle.getByRole("radio", { name: "Bahasa Indonesia" }).click();
    await expect(page.getByTestId("theme-settings-card").getByText("Tampilan", { exact: true })).toBeVisible();
  });
});
