import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  card,
  expectCardClearOfTarget,
  expectHighlighted,
  expectNoHorizontalScroll,
  shot,
  sizesFor,
} from "./tour-helpers";

/**
 * Steps are filtered by `ctx.modules.ahu` when the tour starts, so hold the
 * tutorial progress until the org modules have reached the page (the AHU entry
 * or the own-folder list has rendered). Real users start from the invite card,
 * long after the modules load.
 */
async function startWhenModulesLoaded(page: Page, ready: (page: Page) => Locator) {
  await page.route("**/api/tutorials", async (route) => {
    if (route.request().method() === "GET") {
      await ready(page).first().waitFor({ state: "attached" });
    }
    await route.continue();
  });
  await page.goto("/database?tour=database");
}

const target = (page: Page, name: string) => page.locator(`[data-tour="${name}"]:visible`).first();

async function expectStep(page: Page, n: number, total: number, name: string) {
  await expect(card(page)).toContainText(`${n} / ${total}`);
  // The target may still be scrolling into view (smooth scroll, table overflow).
  await expect(async () => expectHighlighted(page, name)).toPass();
  await expectCardClearOfTarget(page, name);
  await expectNoHorizontalScroll(page);
}

test.describe("database tutorial (AHU)", () => {
  for (const scheme of ["light", "dark"] as const) {
    test(`runs to the end and leaves the price unchanged (${scheme})`, async ({ page }, testInfo) => {
      await page.emulateMedia({ colorScheme: scheme });
      await startWhenModulesLoaded(page, (p) => p.locator('[data-tour="database.folder.ahu"]'));
      for (const [i, size] of sizesFor(testInfo.project.name).entries()) {
        await page.setViewportSize(size);
        if (i > 0) await page.goto("/database?tour=database");
        const name = (n: number) => `database-${n}-${scheme}-${size.width}`;

        await expectStep(page, 1, 7, "database.folder.ahu");
        await shot(page, name(1));
        await target(page, "database.folder.ahu").click();

        await expectStep(page, 2, 7, "database.folder.material");
        await target(page, "database.folder.material").click();

        await expectStep(page, 3, 7, "database.file");
        await target(page, "database.file").click();

        await expectStep(page, 4, 7, "database.search");
        await target(page, "database.search").fill("SGCC");

        await expectStep(page, 5, 7, "database.price-edit");
        await expect(target(page, "database.price-edit")).toHaveCSS("opacity", "1");
        const price = await target(page, "database.price-cell").innerText();
        await shot(page, name(5));
        await target(page, "database.price-edit").click();

        await expectStep(page, 6, 7, "database.price-editor-actions");
        await shot(page, name(6));
        await page.getByRole("dialog", { name: "Edit material" }).getByRole("button", { name: "Batal" }).click();
        await expect(page.getByRole("dialog", { name: "Edit material" })).toHaveCount(0);

        await expectStep(page, 7, 7, "database.price-cell");
        await expect(target(page, "database.price-cell")).toHaveText(price);
        await shot(page, name(7));
        await card(page).getByRole("button", { name: "Selesai" }).click();
        await expect(card(page)).toHaveCount(0);
      }
    });
  }

  test("Esc closes the price editor, not the tutorial", async ({ page }) => {
    await startWhenModulesLoaded(page, (p) => p.locator('[data-tour="database.folder.ahu"]'));
    for (const [n, name] of [
      [1, "database.folder.ahu"],
      [2, "database.folder.material"],
      [3, "database.file"],
    ] as const) {
      await expect(card(page)).toContainText(`${n} / 7`);
      await target(page, name).click();
    }
    await expect(card(page)).toContainText("4 / 7");
    await target(page, "database.search").fill("SUS304");
    await expect(card(page)).toContainText("5 / 7");
    await target(page, "database.price-edit").click();
    await expect(card(page)).toContainText("6 / 7");

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Edit material" })).toHaveCount(0);
    await expect(card(page)).toContainText("7 / 7");
    await expect(target(page, "database.price-cell")).toHaveText(/65\.000/);
  });

  test("Lewati closes the tutorial", async ({ page }) => {
    await startWhenModulesLoaded(page, (p) => p.locator('[data-tour="database.folder.ahu"]'));
    await expect(card(page)).toContainText("1 / 7");
    await card(page).getByRole("button", { name: "Lewati" }).click();
    await expect(card(page)).toHaveCount(0);
  });
});

test("database tutorial without AHU and without files never gets stuck", async ({ page }) => {
  await page.route("**/api/settings", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    const res = await route.fetch();
    const json = await res.json();
    await route.fulfill({ response: res, json: { ...json, modules: { ...json.modules, ahu: false } } });
  });
  await startWhenModulesLoaded(page, (p) => p.locator('[data-tour="database.folder.mine"]'));

  await expectStep(page, 1, 4, "database.folder.mine");
  await target(page, "database.folder.mine").click();

  await expectStep(page, 2, 4, "database.new-file");
  const saved = page.waitForRequest(
    (r) => r.url().includes("/api/tutorials") && r.method() === "PUT",
    { timeout: 15_000 }
  );
  await card(page).getByRole("button", { name: "Lanjut" }).click();

  // The seeded folder is empty: "Buka file" and the table step are skipped after 3s each.
  expect((await saved).postDataJSON()).toEqual({ key: "database", status: "done" });
  await expect(card(page)).toHaveCount(0);
});
