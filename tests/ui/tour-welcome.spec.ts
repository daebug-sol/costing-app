import { expect, test } from "@playwright/test";
import {
  card,
  expectCardClearOfTarget,
  expectHighlighted,
  expectNoHorizontalScroll,
  shot,
  sizesFor,
} from "./tour-helpers";

const targets = [
  null,
  "dashboard",
  "database",
  "costing",
  "documentation",
  "account",
] as const;

function targetFor(step: (typeof targets)[number], width: number) {
  if (step === null) return null;
  if (step === "account") return "account.menu";
  return width >= 1024 ? `nav.${step}` : `nav-mobile.${step}`;
}

test.describe("welcome tour", () => {
  for (const scheme of ["light", "dark"] as const) {
    test(`runs to the end with Lanjut (${scheme})`, async ({ page }, testInfo) => {
      for (const size of sizesFor(testInfo.project.name)) {
        await page.setViewportSize(size);
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto("/?tour=welcome");
        for (let i = 0; i < targets.length; i++) {
          await expect(card(page)).toContainText(`${i + 1} / 6`);
          const target = targetFor(targets[i], size.width);
          if (target) {
            await expectHighlighted(page, target);
            await expectCardClearOfTarget(page, target);
          }
          await expectNoHorizontalScroll(page);
          if (i === 0 || i === 3) await shot(page, `welcome-${i + 1}-${scheme}-${size.width}`);
          await card(page)
            .getByRole("button", { name: i === targets.length - 1 ? "Selesai" : "Lanjut" })
            .click();
        }
        await expect(card(page)).toHaveCount(0);
      }
    });
  }

  test("Lewati and Esc close the tour", async ({ page }) => {
    await page.goto("/?tour=welcome");
    await card(page).getByRole("button", { name: "Lewati" }).click();
    await expect(card(page)).toHaveCount(0);

    await page.goto("/?tour=welcome");
    await expect(card(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(card(page)).toHaveCount(0);
  });

  test("survives resize across lg", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop");
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/?tour=welcome");
    for (let i = 0; i < 3; i++) await card(page).getByRole("button", { name: "Lanjut" }).click();
    await expect(card(page)).toContainText("4 / 6");
    await expectHighlighted(page, "nav.costing");

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(card(page)).toContainText("4 / 6");
    await expect(async () => expectHighlighted(page, "nav-mobile.costing")).toPass();
    await expectNoHorizontalScroll(page);
  });

  test("dims the page and blocks clicks outside the highlight", async ({ page }) => {
    await page.goto("/?tour=welcome");
    await card(page).getByRole("button", { name: "Lanjut" }).click();
    await expect(page.locator("[data-tour-hole]")).toBeVisible();
    // A click on the dimmed area does not navigate away.
    await page.mouse.click(5, 300);
    await expect(page).toHaveURL(/\/\?tour=welcome$/);
    await expect(card(page)).toContainText("2 / 6");
  });
});

test("no tour opens by itself under AUTH_BYPASS", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(card(page)).toHaveCount(0);
  await expect(page.locator("[data-tour-invite]")).toHaveCount(0);
});
