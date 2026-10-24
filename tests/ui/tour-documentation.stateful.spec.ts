import { expect, test, type Page } from "@playwright/test";
import {
  card,
  expectCardClearOfTarget,
  expectHighlighted,
  expectNoHorizontalScroll,
  shot,
} from "./tour-helpers";

/**
 * The seed has no quotations, so this spec creates one (and deletes it again).
 * That is why it runs in the `stateful` project, after the visual baselines.
 */

const SIZES = [
  { width: 1280, height: 800 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
];

const target = (page: Page, name: string) =>
  page.locator(`[data-tour="${name}"]:visible`).first();

async function expectStep(page: Page, n: number, name: string) {
  await expect(card(page)).toContainText(`${n} / 8`);
  await expect(async () => expectHighlighted(page, name)).toPass();
  await expectCardClearOfTarget(page, name);
  await expectNoHorizontalScroll(page);
}

test.describe("documentation tutorial", () => {
  let id: string;

  test.beforeEach(async ({ request }) => {
    const res = await request.post("/api/quotations");
    expect(res.ok()).toBeTruthy();
    id = ((await res.json()) as { id: string }).id;
  });

  test.afterEach(async ({ request }) => {
    await request.delete(`/api/quotations/${id}`);
  });

  for (const scheme of ["light", "dark"] as const) {
    test(`runs from the list to the PDF at 1280, 768 and 390 (${scheme})`, async ({ page }) => {
      test.setTimeout(180_000);
      await page.emulateMedia({ colorScheme: scheme });
      for (const size of SIZES) {
        await page.setViewportSize(size);
        const desktop = size.width >= 1024;
        const tag = `${scheme}-${size.width}`;
        await page.goto("/documentation?tour=documentation");

        await expectStep(page, 1, "documentation.folder.all");
        await shot(page, `1-folder-${tag}`);
        await target(page, "documentation.folder.all").click();

        await expectStep(page, 2, "documentation.quote-row");
        await target(page, "documentation.quote-row").click();

        await expectStep(page, 3, "documentation.o2c-progress");
        await shot(page, `3-o2c-${tag}`);
        await card(page).getByRole("button", { name: "Lanjut" }).click();

        await expectStep(page, 4, "documentation.open-quote");
        await target(page, "documentation.open-quote").click();

        const preview = desktop ? "documentation.preview" : "documentation.preview-toggle";
        await expectStep(page, 5, preview);
        await shot(page, `5-preview-${tag}`);
        await card(page).getByRole("button", { name: "Lanjut" }).click();

        await expectStep(page, 6, "documentation.export");
        await target(page, "documentation.export").click();

        await expectStep(page, 7, "documentation.export-pdf");
        await shot(page, `7-pdf-${tag}`);
        const download = page.waitForEvent("download");
        await target(page, "documentation.export-pdf").click();
        expect((await download).suggestedFilename()).toMatch(/\.pdf$/);

        await expectStep(page, 8, "documentation.to-sales-order");
        await card(page).getByRole("button", { name: "Selesai" }).click();
        await expect(card(page)).toHaveCount(0);
      }
    });
  }

  test("Lewati closes it on the first step", async ({ page }) => {
    await page.goto("/documentation?tour=documentation");
    await expect(card(page)).toContainText("1 / 8");
    await card(page).getByRole("button", { name: "Lewati" }).click();
    await expect(card(page)).toHaveCount(0);
  });

  test("clicks on the dimmed page do not open another quotation", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/documentation?tour=documentation");
    await target(page, "documentation.folder.all").click();
    await expect(card(page)).toContainText("2 / 8");
    await page.mouse.click(640, 780);
    await expect(page).toHaveURL(/\/documentation\?tour=documentation$/);
    await expect(card(page)).toContainText("2 / 8");
  });
});
