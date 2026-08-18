import { expect, test } from "@playwright/test";

import { freezeClock, serveWeather } from "./fixtures";

/**
 * The outlook's one job beyond looking at it: finding a window and handing it
 * to the form. Everything else about it is arithmetic covered by the unit
 * tests.
 */
test.describe("the week ahead", () => {
  test("hands a chosen window to the round above it", async ({ page }) => {
    await freezeClock(page);
    await serveWeather(page);
    await page.goto("/");

    await page
      .getByRole("button", { name: /morning on Friday 2 October/ })
      .click();
    await page.getByRole("button", { name: "Take a proper look" }).click();

    await expect(page.getByLabel("Date")).toContainText("Friday 2 October 2026");
    await expect(page.locator("#tee-time")).toHaveValue("08:00");
  });

  test("scores every window of every day", async ({ page }) => {
    await freezeClock(page);
    await serveWeather(page);
    await page.goto("/");

    const week = page.getByRole("region", { name: "The week ahead" });
    // Seven days, three windows each, and none of them missing: the fixture
    // covers the whole run, so anything unscored is a fault in the slicing.
    await expect(week.getByRole("button", { name: /out of 100/ })).toHaveCount(21);
  });
});
