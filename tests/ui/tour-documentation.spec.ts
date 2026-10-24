import { expect, test } from "@playwright/test";
import { card, expectNoHorizontalScroll, sizesFor } from "./tour-helpers";

/** The full run needs a quotation, see tour-documentation.stateful.spec.ts. */
test("documentation tutorial never gets stuck when there are no quotations", async ({
  page,
  request,
}, testInfo) => {
  const list = (await (await request.get("/api/quotations")).json()) as unknown[];
  test.skip(list.length > 0, "needs an empty quotation list (seed state)");
  test.setTimeout(90_000);

  for (const size of sizesFor(testInfo.project.name)) {
    await page.setViewportSize(size);
    await page.goto("/documentation?tour=documentation");
    await expect(card(page)).toContainText("1 / 8");
    await expectNoHorizontalScroll(page);
    const finished = page.waitForRequest(
      (r) =>
        r.url().endsWith("/api/tutorials") &&
        r.method() === "PUT" &&
        r.postDataJSON()?.key === "documentation",
      { timeout: 35_000 }
    );
    await page.locator('[data-tour="documentation.folder.all"]:visible').first().click();
    // Every later target is missing: each step gives up after 3s and the tour closes as done.
    expect((await finished).postDataJSON().status).toBe("done");
    await expect(card(page)).toHaveCount(0);
    await expect(page.getByText("Tidak ada penawaran")).toBeVisible();
  }
});
