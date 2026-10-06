import { expect, test } from "@playwright/test";

/**
 * Language switching must not depend on API data, so these checks only use
 * chrome that renders even when the backend is unavailable.
 */
test.describe("language switcher", () => {
  test("defaults to Indonesian, switches to English, and persists", async ({ page }) => {
    await page.goto("/");
    const switcher = page.getByTestId("language-switcher");
    await expect(switcher).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "id");
    await expect(switcher).toHaveAttribute("aria-label", "Ganti bahasa");

    await switcher.getByRole("button", { name: "EN" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(switcher).toHaveAttribute("aria-label", "Change language");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(
      page.getByTestId("language-switcher").getByRole("button", { name: "EN" })
    ).toHaveAttribute("aria-pressed", "true");
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
