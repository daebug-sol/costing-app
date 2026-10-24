import { expect, test } from "@playwright/test";
import {
  card,
  expectCardClearOfTarget,
  expectHighlighted,
  expectNoHorizontalScroll,
  shot,
  sizesFor,
} from "./tour-helpers";

const steps = ["help.tutorials", "help.tutorials.replay"] as const;

test.describe("help tutorial", () => {
  for (const scheme of ["light", "dark"] as const) {
    test(`runs to the end with Lanjut (${scheme})`, async ({ page }, testInfo) => {
      for (const size of sizesFor(testInfo.project.name)) {
        await page.setViewportSize(size);
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto("/help?tour=help");
        for (let i = 0; i < steps.length; i++) {
          await expect(card(page)).toContainText(`${i + 1} / ${steps.length}`);
          // The target scrolls into view smoothly; check once it has settled.
          await expect(async () => {
            await expectHighlighted(page, steps[i]);
            await expectCardClearOfTarget(page, steps[i]);
          }).toPass();
          await expectNoHorizontalScroll(page);
          await shot(page, `help-${i + 1}-${scheme}-${size.width}`);
          await card(page)
            .getByRole("button", { name: i === steps.length - 1 ? "Selesai" : "Lanjut" })
            .click();
        }
        await expect(card(page)).toHaveCount(0);
      }
    });
  }
});

test.describe("Help hub: Tutorial interaktif", () => {
  test("lists tutorials with a status and a Mulai / Ulangi button", async ({ page }, testInfo) => {
    for (const size of sizesFor(testInfo.project.name)) {
      await page.setViewportSize(size);
      await page.goto("/help");
      const section = page.getByTestId("help-tutorials");
      await expect(section).toBeVisible();
      for (const name of ["Tur selamat datang", "Lengkapi data perusahaan"]) {
        const row = section.getByRole("listitem").filter({ hasText: name });
        await expect(row.getByText(/^(Belum|Selesai|Dilewati)$/)).toBeVisible();
        await expect(row.getByRole("button", { name: new RegExp(`tutorial ${name}`) })).toBeVisible();
      }
      await section.scrollIntoViewIfNeeded();
      await expectNoHorizontalScroll(page);
    }
  });

  test("the welcome tour starts in place", async ({ page }) => {
    await page.goto("/help");
    await page.getByRole("button", { name: /tutorial Tur selamat datang/ }).click();
    await expect(card(page)).toContainText("1 / 6");
    await expect(page).toHaveURL(/\/help$/);
  });

  test("a module tutorial opens its page and starts there", async ({ page }) => {
    await page.goto("/help");
    await page.getByRole("button", { name: /tutorial Lengkapi data perusahaan/ }).click();
    await expect(page).toHaveURL(/\/settings\?tour=settings$/);
    await expect(card(page)).toContainText("1 / 5");
    await card(page).getByRole("button", { name: "Lewati" }).click();
    await expect(card(page)).toHaveCount(0);

    // The same row starts it again later in the session.
    await page.goBack();
    await expect(page).toHaveURL(/\/help$/);
    await page.getByRole("button", { name: /tutorial Lengkapi data perusahaan/ }).click();
    await expect(page).toHaveURL(/\/settings\?tour=settings$/);
    await expect(card(page)).toContainText("1 / 5");
  });
});
