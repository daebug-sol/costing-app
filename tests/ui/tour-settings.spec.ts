import { expect, test, type Page } from "@playwright/test";
import {
  card,
  expectCardClearOfTarget,
  expectHighlighted,
  expectNoHorizontalScroll,
  shot,
  sizesFor,
} from "./tour-helpers";

const steps = [
  "settings.company-name",
  "settings.company-save",
  "settings.forex-usd",
  "settings.forex-save",
  "settings.appearance",
] as const;

/**
 * Saves answer with the unchanged settings row, so the tutorial runs on the
 * shared seed without changing it. Returns the bodies the page sent.
 */
async function stubSettingsSave(page: Page, overrides: Record<string, unknown> = {}) {
  const sent: Record<string, unknown>[] = [];
  await page.route("**/api/settings", async (route) => {
    const res = await route.fetch({ method: "GET" });
    if (route.request().method() === "PUT") sent.push(route.request().postDataJSON());
    await route.fulfill({ response: res, json: { ...(await res.json()), ...overrides } });
  });
  return sent;
}

async function expectStep(page: Page, index: number) {
  await expect(card(page)).toContainText(`${index + 1} / ${steps.length}`);
  // The target scrolls into view smoothly; check once it has settled.
  await expect(async () => {
    await expectHighlighted(page, steps[index]);
    await expectCardClearOfTarget(page, steps[index]);
  }).toPass();
  await expectNoHorizontalScroll(page);
}

test.describe("settings tutorial", () => {
  for (const scheme of ["light", "dark"] as const) {
    test(`runs to the end by filling and saving (${scheme})`, async ({ page }, testInfo) => {
      // Two viewports x five steps, each waiting for a smooth scroll.
      test.setTimeout(90_000);
      const sent = await stubSettingsSave(page);
      for (const size of sizesFor(testInfo.project.name)) {
        sent.length = 0;
        await page.setViewportSize(size);
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto("/settings?tour=settings");

        await expectStep(page, 0);
        await page.locator("#co-name").fill("PT Latihan Tutorial");
        await shot(page, `settings-1-${scheme}-${size.width}`);
        await card(page).getByRole("button", { name: "Lanjut" }).click();

        await expectStep(page, 1);
        await expect(card(page).getByRole("button", { name: "Lanjut" })).toHaveCount(0);
        await shot(page, `settings-2-${scheme}-${size.width}`);
        await page.locator('[data-tour="settings.company-save"]').click();

        await expectStep(page, 2);
        await page.locator("#forexUSD").fill("16500");
        await card(page).getByRole("button", { name: "Lanjut" }).click();

        await expectStep(page, 3);
        await page.locator('[data-tour="settings.forex-save"]').click();

        await expectStep(page, 4);
        await shot(page, `settings-5-${scheme}-${size.width}`);
        await card(page).getByRole("button", { name: "Selesai" }).click();
        await expect(card(page)).toHaveCount(0);

        // What the user typed inside the highlight is what got saved.
        expect(sent).toEqual([
          expect.objectContaining({ companyName: "PT Latihan Tutorial" }),
          expect.objectContaining({ forexUSD: 16500 }),
        ]);
      }
    });
  }

  test("the setup card starts the tutorial", async ({ page }) => {
    await stubSettingsSave(page, { onboardingComplete: false });
    await page.goto("/settings");
    await page.getByRole("button", { name: "Mulai tutorial" }).click();
    await expect(card(page)).toContainText(`1 / ${steps.length}`);
    await expect(async () => expectHighlighted(page, "settings.company-name")).toPass();
    await expect(page.getByRole("link", { name: "Buka panduan Help" })).toHaveCount(0);
  });

  test("Lewati closes it", async ({ page }) => {
    await stubSettingsSave(page);
    await page.goto("/settings?tour=settings");
    await expect(card(page)).toContainText(`1 / ${steps.length}`);
    await card(page).getByRole("button", { name: "Lewati" }).click();
    await expect(card(page)).toHaveCount(0);
  });
});
