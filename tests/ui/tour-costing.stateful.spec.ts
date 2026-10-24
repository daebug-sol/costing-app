import { devices, expect, test, type Locator, type Page } from "@playwright/test";
import {
  card,
  expectCardClearOfTarget,
  expectHighlighted,
  expectNoHorizontalScroll,
  shot,
} from "./tour-helpers";

/*
 * Runs the "Coba sendiri" costing tutorial end to end. It creates a real
 * project and quotation, so it lives in the `stateful` project and cleans up
 * after itself. Each size gets its own describe block; 390 uses the iPhone 13
 * profile (touch, mobile UA) like the chromium-mobile project.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { defaultBrowserType: _webkit, ...iphone } = devices["iPhone 13"];

const SIZES = [
  { width: 1280, use: { viewport: { width: 1280, height: 800 } } },
  { width: 768, use: { viewport: { width: 768, height: 1024 } } },
  { width: 390, use: iphone },
] as const;

const TOTAL = 10;

async function expectStep(page: Page, n: number, target: string, clear = true) {
  await expect(card(page)).toContainText(`${n} / ${TOTAL}`);
  await expect(async () => expectHighlighted(page, target)).toPass();
  if (clear) await expectCardClearOfTarget(page, target);
  await expectNoHorizontalScroll(page);
}

/** The card must not sit on top of an element the user has to use. */
async function expectClear(page: Page, el: Locator) {
  const c = await card(page).boundingBox();
  const b = await el.boundingBox();
  expect(c && b).toBeTruthy();
  const overlap =
    c!.x < b!.x + b!.width && c!.x + c!.width > b!.x && c!.y < b!.y + b!.height && c!.y + c!.height > b!.y;
  expect(overlap).toBe(false);
}

const visible = (page: Page, target: string) =>
  page.locator(`[data-tour="${target}"]:visible`).first();

for (const size of SIZES) {
  test.describe(`costing tutorial at ${size.width}`, () => {
    test.use(size.use);

    for (const scheme of ["light", "dark"] as const) {
      test(`builds a project and opens a quotation (${scheme})`, async ({ page, request }) => {
        test.setTimeout(120_000);
        const name = `Latihan tur ${size.width} ${scheme} ${Date.now()}`;
        const tag = `${scheme}-${size.width}`;
        const desktop = size.width >= 1024;
        let projectId: string | null = null;
        let quotationId: string | null = null;
        await page.emulateMedia({ colorScheme: scheme });

        try {
          await page.goto("/costing?tour=costing");
          await expect(card(page)).toBeVisible({ timeout: 15_000 });

          await expectStep(page, 1, "costing.new-project");
          await shot(page, `costing-1-new-project-${tag}`);
          await visible(page, "costing.new-project").click();

          // On phones the docked card may cover the dialog title, never its input or buttons.
          await expectStep(page, 2, "costing.new-project-dialog", desktop);
          const createButton = page.getByRole("button", { name: "Buat", exact: true });
          await expectClear(page, page.locator("#np-name"));
          await expectClear(page, createButton);
          await page.locator("#np-name").fill(name);
          await shot(page, `costing-2-name-${tag}`);
          await createButton.click();

          await expect(page).toHaveURL(/\?project=/);
          projectId = new URL(page.url()).searchParams.get("project");
          await expectStep(page, 3, desktop ? "costing.add-item" : "costing.add-item.single");
          await shot(page, `costing-3-add-item-${tag}`);
          await page.getByRole("button", { name: "Single Item" }).click();

          await expectStep(page, 4, "costing.add-material");
          await visible(page, "costing.add-material").click();

          const picker = page.getByRole("dialog", { name: "Pilih item dari database" });
          await expectStep(page, 5, desktop ? "costing.material-picker.list" : "costing.material-picker.row");
          await shot(page, `costing-5-pick-material-${tag}`);
          await picker.getByRole("checkbox").first().click();

          await expectStep(page, 6, "costing.material-picker.confirm");
          await shot(page, `costing-6-confirm-material-${tag}`);
          await picker.getByRole("button", { name: "Tambahkan ke item" }).click();
          await expect(picker).toHaveCount(0);

          await expectStep(page, 7, "costing.price-bar");
          await shot(page, `costing-7-price-${tag}`);
          await card(page).getByRole("button", { name: "Lanjut" }).click();

          await expectStep(page, 8, desktop ? "costing.margins" : "costing.margins.margin");
          await card(page).getByRole("button", { name: "Lanjut" }).click();

          await expectStep(page, 9, "costing.project-menu");
          await shot(page, `costing-9-cleanup-${tag}`);
          await card(page).getByRole("button", { name: "Lanjut" }).click();

          await expectStep(page, 10, "costing.create-quote");
          await shot(page, `costing-10-quote-${tag}`);
          await visible(page, "costing.create-quote").click();

          await expect(page).toHaveURL(/\/documentation\?id=/, { timeout: 15_000 });
          quotationId = new URL(page.url()).searchParams.get("id");
          await expect(card(page)).toHaveCount(0);
          await expectNoHorizontalScroll(page);
        } finally {
          if (quotationId) await request.delete(`/api/quotations/${quotationId}`);
          if (projectId) await request.delete(`/api/projects/${projectId}`);
        }
      });
    }
  });
}

test("Lewati on an action step closes the tutorial", async ({ page }) => {
  await page.goto("/costing?tour=costing");
  await expect(card(page)).toContainText(`1 / ${TOTAL}`, { timeout: 15_000 });
  await card(page).getByRole("button", { name: "Lewati" }).click();
  await expect(card(page)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Costing" })).toBeVisible();
});

test("Hapus proyek in the project menu removes a practice project", async ({ page, request }) => {
  const name = `Hapus latihan ${Date.now()}`;
  const res = await request.post("/api/projects", { data: { name } });
  const { id } = (await res.json()) as { id: string };
  try {
    await page.goto(`/costing?project=${encodeURIComponent(id)}`);
    await expect(page.getByRole("heading", { name })).toBeVisible();
    await page.getByRole("button", { name: "Aksi proyek" }).click();
    await page.getByRole("menuitem", { name: "Hapus proyek" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText(`Hapus proyek ${name}?`);
    await dialog.getByRole("button", { name: "Hapus proyek" }).click();
    await expect(page).toHaveURL(/\/costing$/);
    await expect(page.getByRole("link", { name: new RegExp(name) })).toHaveCount(0);
  } finally {
    await request.delete(`/api/projects/${id}`);
  }
});
