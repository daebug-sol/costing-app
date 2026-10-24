import { expect, test } from "@playwright/test";
import {
  card,
  expectCardClearOfTarget,
  expectHighlighted,
  expectNoHorizontalScroll,
  shot,
  sizesFor,
} from "./tour-helpers";
import { expectTourSaved, stubPayments } from "./tour-o2c-fixtures";

test.describe("payments tour", () => {
  for (const scheme of ["light", "dark"] as const) {
    test(`shows the history, then where to record a payment (${scheme})`, async ({
      page,
    }, testInfo) => {
      await stubPayments(page);
      for (const size of sizesFor(testInfo.project.name)) {
        await page.setViewportSize(size);
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto("/payments?tour=payments");

        await expect(card(page)).toContainText("1 / 2");
        await expectHighlighted(page, "payments.row");
        await expectCardClearOfTarget(page, "payments.row");
        await expectNoHorizontalScroll(page);
        await shot(page, `payments/row-${scheme}-${size.width}`);
        await card(page).getByRole("button", { name: "Lanjut" }).click();

        await expect(card(page)).toContainText("2 / 2");
        await expectHighlighted(page, "payments.primary-action");
        await expectCardClearOfTarget(page, "payments.primary-action");
        await expectNoHorizontalScroll(page);
        await shot(page, `payments/primary-${scheme}-${size.width}`);
        await card(page).getByRole("button", { name: "Selesai" }).click();
        await expect(card(page)).toHaveCount(0);
      }
    });
  }

  test("an empty history skips to the form", async ({ page }) => {
    await stubPayments(page, []);
    const saved = expectTourSaved(page, "payments");
    await page.goto("/payments?tour=payments");
    // The row step has no target and is skipped after 3s; the form step still runs.
    await expect(card(page)).toContainText("2 / 2", { timeout: 10_000 });
    await expectHighlighted(page, "payments.primary-action");
    await card(page).getByRole("button", { name: "Selesai" }).click();
    expect(await saved).toBe("done");
  });
});
