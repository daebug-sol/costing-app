import { expect, type Page } from "@playwright/test";

export const card = (page: Page) => page.locator("[data-tour-card]");

/** The highlight ring sits PAD (6px) around the target; allow 2px rounding. */
export async function expectHighlighted(page: Page, target: string) {
  const hole = await page.locator("[data-tour-hole]").boundingBox();
  const el = await page.locator(`[data-tour="${target}"]:visible`).first().boundingBox();
  expect(hole && el).toBeTruthy();
  // The hole is clamped to the viewport edge (bottom bar items touch x = 0).
  expect(Math.abs(hole!.x - Math.max(el!.x - 6, 0))).toBeLessThanOrEqual(2);
  expect(Math.abs(hole!.y - Math.max(el!.y - 6, 0))).toBeLessThanOrEqual(2);
  expect(hole!.x + hole!.width).toBeGreaterThanOrEqual(el!.x + el!.width);
  expect(hole!.y + hole!.height).toBeGreaterThanOrEqual(el!.y + el!.height);
}

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

/** Card must not cover its target. */
export async function expectCardClearOfTarget(page: Page, target: string) {
  const c = await card(page).boundingBox();
  const el = await page.locator(`[data-tour="${target}"]:visible`).first().boundingBox();
  expect(c && el).toBeTruthy();
  const overlap =
    c!.x < el!.x + el!.width &&
    c!.x + c!.width > el!.x &&
    c!.y < el!.y + el!.height &&
    c!.y + c!.height > el!.y;
  expect(overlap).toBe(false);
}

/** Saves a screenshot to TOUR_SHOTS_DIR when set (review artifacts, not baselines). */
export async function shot(page: Page, name: string) {
  const dir = process.env.TOUR_SHOTS_DIR;
  if (!dir) return;
  await page.screenshot({ path: `${dir}/${name}.png` });
}

export function sizesFor(projectName: string) {
  return projectName === "chromium-mobile"
    ? [{ width: 390, height: 844 }]
    : [
        { width: 1280, height: 800 },
        { width: 768, height: 1024 },
      ];
}
