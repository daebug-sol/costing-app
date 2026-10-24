import { expect, test, type Page } from "@playwright/test";
import {
  card,
  expectCardClearOfTarget,
  expectHighlighted,
  expectNoHorizontalScroll,
  shot,
  sizesFor,
} from "./tour-helpers";

/** The tutorial saves a real customer; remove it again so reruns start clean. */
async function deleteCustomer(page: Page, name: string) {
  const res = await page.request.get(`/api/customers?q=${encodeURIComponent(name)}`);
  const rows = (await res.json()) as Array<{ id: string; name: string }>;
  for (const row of rows.filter((r) => r.name === name)) {
    await page.request.delete(`/api/customers/${row.id}`);
  }
}

/** Smooth scroll moves the target for a moment after a step starts, so retry. */
async function expectSpotlightOn(page: Page, target: string) {
  await expect(async () => {
    await expectHighlighted(page, target);
    await expectCardClearOfTarget(page, target);
  }).toPass();
}

test.describe("customers tour", () => {
  for (const scheme of ["light", "dark"] as const) {
    test(`adds a real customer from start to finish (${scheme})`, async ({ page }, testInfo) => {
      for (const size of sizesFor(testInfo.project.name)) {
        const name = `Tutorial ${scheme} ${size.width} ${testInfo.project.name}`;
        await deleteCustomer(page, name);
        await page.setViewportSize(size);
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto("/customers?tour=customers");

        await expect(card(page)).toContainText("1 / 4");
        await expectSpotlightOn(page, "customers.add");
        await expectNoHorizontalScroll(page);
        await shot(page, `customers/add-${scheme}-${size.width}`);
        await page.locator('[data-tour="customers.add"]:visible').click();

        await expect(card(page)).toContainText("2 / 4");
        await expectSpotlightOn(page, "customers.name");
        await page.locator("#cust-name").fill(name);
        await expectNoHorizontalScroll(page);
        await shot(page, `customers/name-${scheme}-${size.width}`);
        await card(page).getByRole("button", { name: "Lanjut" }).click();

        await expect(card(page)).toContainText("3 / 4");
        await expectSpotlightOn(page, "customers.save");
        await page.locator('[data-tour="customers.save"]').click();

        await expect(card(page)).toContainText("4 / 4");
        await expect(page.locator('[data-tour="customers.row"]:visible')).toContainText(name);
        await expectSpotlightOn(page, "customers.row");
        await expectNoHorizontalScroll(page);
        await shot(page, `customers/row-${scheme}-${size.width}`);
        await card(page).getByRole("button", { name: "Selesai" }).click();
        await expect(card(page)).toHaveCount(0);

        await deleteCustomer(page, name);
      }
    });
  }

  test("Lewati closes the tour mid-way", async ({ page }) => {
    await page.goto("/customers?tour=customers");
    await expect(card(page)).toContainText("1 / 4");
    await page.locator('[data-tour="customers.add"]:visible').click();
    await expect(card(page)).toContainText("2 / 4");
    await card(page).getByRole("button", { name: "Lewati" }).click();
    await expect(card(page)).toHaveCount(0);
  });
});
