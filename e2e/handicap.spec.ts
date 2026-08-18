import { expect, test } from "@playwright/test";

import { freezeClock, saveHandicap, serveWeather } from "./fixtures";

/**
 * The arithmetic is covered by the unit tests. What needs a browser is that
 * the numbers typed in survive, and that the band answers for the card that is
 * actually selected.
 */
test.describe("what you'd need to shoot", () => {
  test("takes an index and a set of tees, and remembers both", async ({ page }) => {
    await freezeClock(page);
    await serveWeather(page);
    await page.goto("/");

    await page.getByLabel("Handicap index").fill("12.4");
    await page.getByRole("button", { name: "Tees" }).click();

    await page.getByLabel("Tees", { exact: true }).fill("White");
    await page.getByLabel("Par", { exact: true }).fill("72");
    await page.getByLabel("Course rating", { exact: true }).fill("72.6");
    await page.getByLabel("Slope rating", { exact: true }).fill("132");
    await page.getByRole("button", { name: "Add these tees" }).click();

    // 12.4 × (132 / 113) + (72.6 − 72) = 15.08, so fifteen shots off par 72.
    const card = page.getByRole("region", { name: "What you'd need to shoot" });
    await expect(card).toContainText("you get 15 shots over 18 holes");
    await expect(card.getByRole("row", { name: /playing to your handicap/ })).toContainText(
      "87"
    );

    await page.reload();
    await expect(page.getByLabel("Handicap index")).toHaveValue("12.4");
    await expect(card).toContainText("you get 15 shots over 18 holes");
  });

  test("answers for nine holes off the nine-hole ratings", async ({ page }) => {
    await freezeClock(page);
    await serveWeather(page);
    await saveHandicap(page);
    await page.goto("/");

    const card = page.getByRole("region", { name: "What you'd need to shoot" });
    await expect(card).toContainText("you get 15 shots over 18 holes");

    await card.getByRole("radio", { name: "9 holes" }).click();

    // 6.2 × (129 / 113) + (36.2 − 36) = 7.28, so seven shots off par 36.
    await expect(card).toContainText("you get 7 shots over 9 holes");
    await expect(card.getByRole("row", { name: /playing to your handicap/ })).toContainText(
      "43"
    );
  });

  test("offers nine holes only when the card carries the ratings for it", async ({
    page,
  }) => {
    await freezeClock(page);
    await serveWeather(page);
    await saveHandicap(page);
    await page.goto("/");

    const card = page.getByRole("region", { name: "What you'd need to shoot" });
    await expect(card.getByRole("radio", { name: "9 holes" })).toBeVisible();

    // The yellows in the fixture carry no nine-hole rating, so the choice goes.
    await card.getByLabel("Tees").click();
    await page.getByRole("option", { name: "Yellow" }).click();
    await expect(card.getByRole("radio", { name: "9 holes" })).toHaveCount(0);
  });
});
