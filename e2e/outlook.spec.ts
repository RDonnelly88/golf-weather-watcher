import { expect, test } from "@playwright/test";

import { freezeClock, serveWeather } from "./fixtures";

/**
 * What the grid does beyond being looked at: fills the strip from whatever is
 * under the pointer, and hands an hour to the round above. The scoring behind
 * every cell is covered by the unit tests.
 */
test.describe("the week ahead", () => {
  test("hands a chosen hour to the round above it", async ({ page }) => {
    await freezeClock(page);
    await serveWeather(page);
    await page.goto("/");

    await page.getByRole("button", { name: /08:00 on Friday 2 October/ }).click();
    await page.getByRole("button", { name: "Take a proper look" }).click();

    await expect(page.getByLabel("Date")).toContainText("Friday 2 October 2026");
    await expect(page.locator("#tee-time")).toHaveValue("08:00");
  });

  // Hovering is a pointer's privilege; a phone gets the same detail by tapping,
  // which the first test covers.
  test("shows the hour under the pointer", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "no pointer to hover with");

    await freezeClock(page);
    await serveWeather(page);
    await page.goto("/");

    const week = page.getByRole("region", { name: "The week ahead" });
    const strip = page.getByRole("group", { name: "The hour you're looking at" });

    // The strip opens on the best hour of the week and follows the pointer
    // from there.
    await week.getByRole("button", { name: /14:00 on Tuesday 29 September/ }).hover();
    await expect(strip).toContainText("Tuesday 29 September");

    await week.getByRole("button", { name: /09:00 on Sunday 27 September/ }).hover();
    await expect(strip).toContainText("Sunday 27 September");
    await expect(strip).not.toContainText("Tuesday");
  });

  test("offers no tee time in the dark", async ({ page }) => {
    await freezeClock(page);
    await serveWeather(page);
    await page.goto("/");

    const week = page.getByRole("region", { name: "The week ahead" });
    // The sun is down by ten at night all week in the fixture, so those hours
    // are drawn but never offered.
    await expect(week.getByRole("button", { name: /22:00/ })).toHaveCount(0);
    await expect(week.getByRole("button", { name: /14:00/ })).toHaveCount(7);
  });
});
