import { expect, test } from "@playwright/test";
import {
  DEFAULT_THEME_PREFERENCES,
  THEME_STORAGE_KEY,
  serializeThemePreferences,
} from "../../lib/theme-preferences";

async function setThemePreferences(
  page: import("@playwright/test").Page,
  preferences: { palette: "professional" | "warm"; appearance: "light" | "dark" | "system" }
) {
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    {
      key: THEME_STORAGE_KEY,
      value: serializeThemePreferences(preferences),
    }
  );
}

test.describe("Settings ('/settings')", () => {
  test("renders heading and key cards", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { level: 1, name: "Pengaturan" })).toBeVisible();
    await expect(page.getByText("Tampilan", { exact: true })).toBeVisible();
    await expect(page.getByTestId("theme-settings-card")).toBeVisible();
  });

  test("matches visual baseline (settings shell)", async ({ page }) => {
    await setThemePreferences(page, DEFAULT_THEME_PREFERENCES);
    await page.goto("/settings");
    await expect(page.getByRole("heading", { level: 1, name: "Pengaturan" })).toBeVisible();
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveScreenshot("settings-shell.png", {
      fullPage: true,
      mask: [page.locator(".tabular-money"), page.locator("[data-volatile]")],
      animations: "disabled",
    });
  });

  test("switches palette and appearance with immediate preview", async ({ page }) => {
    await setThemePreferences(page, DEFAULT_THEME_PREFERENCES);
    await page.goto("/settings");
    await expect(page.getByTestId("theme-settings-card")).toBeVisible();

    await page.getByTestId("theme-palette-toggle").getByText("Hangat", { exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-palette", "warm");

    await page.getByTestId("theme-appearance-toggle").getByText("Gelap", { exact: true }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("persists theme preferences after reload", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByTestId("theme-settings-card")).toBeVisible();

    await page.getByTestId("theme-palette-toggle").getByText("Hangat", { exact: true }).click();
    await page.getByTestId("theme-appearance-toggle").getByText("Gelap", { exact: true }).click();

    await page.waitForFunction((key) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as { palette?: string; appearance?: string };
      return parsed.palette === "warm" && parsed.appearance === "dark";
    }, THEME_STORAGE_KEY);

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-palette", "warm");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(
      page.getByTestId("theme-palette-toggle").getByText("Hangat", { exact: true })
    ).toHaveAttribute("data-state", "on");
    await expect(
      page.getByTestId("theme-appearance-toggle").getByText("Gelap", { exact: true })
    ).toHaveAttribute("data-state", "on");
  });

  test("matches dark professional visual baseline", async ({ page }) => {
    await setThemePreferences(page, { palette: "professional", appearance: "dark" });
    await page.goto("/settings");
    await expect(page.getByRole("heading", { level: 1, name: "Pengaturan" })).toBeVisible();
    await expect(page.getByTestId("theme-settings-card")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-palette", "professional");
    await expect(page.locator("html")).toHaveClass(/dark/);

    await expect(page).toHaveScreenshot("settings-shell-dark.png", {
      fullPage: true,
      mask: [page.locator(".tabular-money"), page.locator("[data-volatile]")],
      animations: "disabled",
      timeout: 15_000,
    });
  });

  test("matches dark warm visual baseline", async ({ page }) => {
    await setThemePreferences(page, { palette: "warm", appearance: "dark" });
    await page.goto("/settings");
    await expect(page.getByRole("heading", { level: 1, name: "Pengaturan" })).toBeVisible();
    await expect(page.getByTestId("theme-settings-card")).toBeVisible();

    await expect(page).toHaveScreenshot("settings-shell-dark-warm.png", {
      fullPage: true,
      mask: [page.locator(".tabular-money"), page.locator("[data-volatile]")],
      animations: "disabled",
      timeout: 15_000,
    });
  });

  test("system appearance follows emulated color scheme", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await setThemePreferences(page, DEFAULT_THEME_PREFERENCES);
    await page.goto("/settings");

    await expect(page.locator("html")).toHaveAttribute("data-palette", "professional");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(
      page.getByTestId("theme-appearance-toggle").getByText("Sistem", { exact: true })
    ).toHaveAttribute("data-state", "on");
  });
});
