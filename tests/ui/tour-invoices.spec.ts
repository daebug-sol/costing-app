import { expect, test } from "@playwright/test";
import {
  card,
  expectCardClearOfTarget,
  expectHighlighted,
  expectNoHorizontalScroll,
  shot,
  sizesFor,
} from "./tour-helpers";
import { expectTourSaved, stubInvoices } from "./tour-o2c-fixtures";

test.describe("invoices tour", () => {
  for (const scheme of ["light", "dark"] as const) {
    test(`opens a row and ends on the primary actions (${scheme})`, async ({ page }, testInfo) => {
      await stubInvoices(page);
      for (const size of sizesFor(testInfo.project.name)) {
        await page.setViewportSize(size);
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto("/invoices?tour=invoices");

        await expect(card(page)).toContainText("1 / 2");
        await expectHighlighted(page, "invoices.row");
        await expectCardClearOfTarget(page, "invoices.row");
        await expectNoHorizontalScroll(page);
        await shot(page, `invoices/row-${scheme}-${size.width}`);
        await page.locator('[data-tour="invoices.row"]:visible').first().click();

        await expect(page).toHaveURL(/\/invoices\?id=inv-tour-1$/);
        await expect(card(page)).toContainText("2 / 2");
        await expectHighlighted(page, "invoices.primary-action");
        await expectCardClearOfTarget(page, "invoices.primary-action");
        await expectNoHorizontalScroll(page);
        await shot(page, `invoices/primary-${scheme}-${size.width}`);
        await card(page).getByRole("button", { name: "Selesai" }).click();
        await expect(card(page)).toHaveCount(0);
      }
    });
  }

  test("an empty list does not trap the tour", async ({ page }) => {
    await stubInvoices(page, []);
    const saved = expectTourSaved(page, "invoices");
    await page.goto("/invoices?tour=invoices");
    await expect(page.getByRole("heading", { name: "Invoice", exact: true })).toBeVisible();
    // Both targets are missing: each step is skipped after 3s and the tour closes as done.
    expect(await saved).toBe("done");
    await expect(card(page)).toHaveCount(0);
    await expect(page.locator("[data-tour-spotlight]")).toHaveCount(0);
  });
});
