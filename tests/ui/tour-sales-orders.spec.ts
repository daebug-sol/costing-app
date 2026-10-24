import { expect, test } from "@playwright/test";
import {
  card,
  expectCardClearOfTarget,
  expectHighlighted,
  expectNoHorizontalScroll,
  shot,
  sizesFor,
} from "./tour-helpers";
import { expectTourSaved, stubSalesOrders } from "./tour-o2c-fixtures";

test.describe("sales orders tour", () => {
  for (const scheme of ["light", "dark"] as const) {
    test(`opens a row and ends on the primary actions (${scheme})`, async ({ page }, testInfo) => {
      await stubSalesOrders(page);
      for (const size of sizesFor(testInfo.project.name)) {
        await page.setViewportSize(size);
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto("/sales-orders?tour=sales-orders");

        await expect(card(page)).toContainText("1 / 2");
        await expectHighlighted(page, "sales-orders.row");
        await expectCardClearOfTarget(page, "sales-orders.row");
        await expectNoHorizontalScroll(page);
        await shot(page, `sales-orders/row-${scheme}-${size.width}`);
        await page.locator('[data-tour="sales-orders.row"]:visible').first().click();

        await expect(page).toHaveURL(/\/sales-orders\?id=so-tour-1$/);
        await expect(card(page)).toContainText("2 / 2");
        await expectHighlighted(page, "sales-orders.primary-action");
        await expectCardClearOfTarget(page, "sales-orders.primary-action");
        await expectNoHorizontalScroll(page);
        await shot(page, `sales-orders/primary-${scheme}-${size.width}`);
        await card(page).getByRole("button", { name: "Selesai" }).click();
        await expect(card(page)).toHaveCount(0);
      }
    });
  }

  test("an empty list does not trap the tour", async ({ page }) => {
    await stubSalesOrders(page, []);
    const saved = expectTourSaved(page, "sales-orders");
    await page.goto("/sales-orders?tour=sales-orders");
    await expect(page.getByRole("heading", { name: "Sales Order" })).toBeVisible();
    // Both targets are missing: each step is skipped after 3s and the tour closes as done.
    expect(await saved).toBe("done");
    await expect(card(page)).toHaveCount(0);
    await expect(page.locator("[data-tour-spotlight]")).toHaveCount(0);
  });
});
