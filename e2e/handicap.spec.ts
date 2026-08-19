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

  test("answers for nine holes when the nine is the card you pick", async ({ page }) => {
    await freezeClock(page);
    await serveWeather(page);
    await saveHandicap(page);
    await page.goto("/");

    const card = page.getByRole("region", { name: "What you'd need to shoot" });
    await expect(card).toContainText("you get 15 shots over 18 holes");

    await card.getByLabel("Tees").click();
    await page.getByRole("option", { name: "White, 9 holes" }).click();

    // 6.2 × (129 / 113) + (36.2 − 36) = 7.28, so seven shots off par 36.
    await expect(card).toContainText("you get 7 shots over 9 holes");
    await expect(card.getByRole("row", { name: /playing to your handicap/ })).toContainText(
      "43"
    );
  });

  test("takes a course that is nine holes and nothing else", async ({ page }) => {
    await freezeClock(page);
    await serveWeather(page);
    await page.goto("/");

    await page.getByLabel("Handicap index").fill("12.4");
    await page.getByRole("button", { name: "Tees" }).click();

    await page.getByRole("radio", { name: "9 holes" }).click();
    await page.getByLabel("Tees", { exact: true }).fill("Yellow");
    await page.getByLabel("Par", { exact: true }).fill("34");
    await page.getByLabel("Course rating", { exact: true }).fill("33.8");
    await page.getByLabel("Slope rating", { exact: true }).fill("118");
    await page.getByRole("button", { name: "Add these tees" }).click();

    // 6.2 × (118 / 113) − 0.2 = 6.27, so six shots off par 34. No eighteen-hole
    // ratings were asked for, because the course doesn't have any.
    const card = page.getByRole("region", { name: "What you'd need to shoot" });
    await expect(card).toContainText("you get 6 shots over 9 holes");
    await expect(card.getByRole("row", { name: /playing to your handicap/ })).toContainText(
      "40"
    );
  });

  test("shows its working, in the reader's own numbers", async ({ page }) => {
    await freezeClock(page);
    await serveWeather(page);
    await saveHandicap(page);
    await page.goto("/");

    const card = page.getByRole("region", { name: "What you'd need to shoot" });
    await card.getByRole("button", { name: "How this is worked out" }).click();

    // The eighteen: 12.4 × (132 ÷ 113) + (72.6 − 72), and no assumed half.
    await expect(card).toContainText("12.4 × (132 ÷ 113) + (72.6 − 72)");
    await expect(card).not.toContainText("The nine you didn't play");

    await card.getByLabel("Tees").click();
    await page.getByRole("option", { name: "White, 9 holes" }).click();

    // The nine halves the index, and names the half it assumes. An index of
    // 12.4 expects (12.4 × 73 + 162) ÷ 140 = 7.62 over the nine not played.
    await expect(card).toContainText("(12.4 ÷ 2) × (129 ÷ 113) + (36.2 − 36)");
    // The assumed half shows its arithmetic too, not just its answer.
    await expect(card).toContainText("(12.4 × 73 + 162) ÷ 140");
    await expect(card).toContainText("7.62");
    // The halves have to add up to the differential the band reports.
    await expect(card).toContainText("13.58, carried to one decimal place");
  });

  test("starts a new set of tees blank, whatever was being edited", async ({
    page,
  }) => {
    await freezeClock(page);
    await serveWeather(page);
    await saveHandicap(page);
    await page.goto("/");

    const card = page.getByRole("region", { name: "What you'd need to shoot" });
    await card.getByRole("button", { name: "Edit" }).click();
    await expect(page.getByLabel("Course rating", { exact: true })).toHaveValue("72.6");

    // Left filled in, the eighteen's rating gets saved against the nine that is
    // being added, and every figure below it is quietly wrong.
    await card.getByRole("button", { name: "Tees", exact: true }).click();
    await expect(page.getByLabel("Course rating", { exact: true })).toHaveValue("");
    await expect(page.getByLabel("Par", { exact: true })).toHaveValue("");
  });

  test("refuses a rating that can't have come off the card", async ({ page }) => {
    await freezeClock(page);
    await serveWeather(page);
    await saveHandicap(page);
    await page.goto("/");

    const card = page.getByRole("region", { name: "What you'd need to shoot" });
    await card.getByRole("button", { name: "Tees", exact: true }).click();
    await page.getByRole("radio", { name: "9 holes" }).click();
    await page.getByRole("textbox", { name: "Tees" }).fill("Yellow F9");
    await page.getByLabel("Par", { exact: true }).fill("36");
    await page.getByLabel("Course rating", { exact: true }).fill("59.8");
    await page.getByLabel("Slope rating", { exact: true }).fill("127");
    await page.getByRole("button", { name: "Add these tees" }).click();

    await expect(page.getByLabel("Course rating", { exact: true })).toHaveAttribute(
      "aria-invalid",
      "true"
    );
    // Nothing saved, so the card still answers for the tees it had.
    await expect(card).toContainText("you get 15 shots over 18 holes");
    await expect(card).not.toContainText("shots over 9 holes");
  });

  test("says so rather than answering for tees that were saved wrong", async ({
    page,
  }) => {
    await freezeClock(page);
    await serveWeather(page);
    await page.addInitScript(() => {
      const key = "St Andrews, Scotland@56.3398,-2.7967";
      localStorage.setItem(
        "golf-weather-watcher-handicap",
        JSON.stringify({
          index: 20,
          tees: {
            [key]: [
              {
                id: "bad",
                name: "Yellow F9",
                holes: 9,
                par: 36,
                courseRating: 59.8,
                slopeRating: 127,
              },
            ],
          },
          chosen: { [key]: "bad" },
        })
      );
    });
    await page.goto("/");

    const card = page.getByRole("region", { name: "What you'd need to shoot" });
    await expect(card).toContainText("can't have come off one card");
    await expect(card).not.toContainText("shots over 9 holes");
    // The index it was saved with is still there to correct them against.
    await expect(page.getByLabel("Handicap index")).toHaveValue("20.0");
  });

  test("keeps the rest when one set of tees is unreadable", async ({ page }) => {
    await freezeClock(page);
    await serveWeather(page);
    await page.addInitScript(() => {
      const key = "St Andrews, Scotland@56.3398,-2.7967";
      localStorage.setItem(
        "golf-weather-watcher-handicap",
        JSON.stringify({
          index: 12.4,
          tees: {
            [key]: [
              { id: "junk", name: "White" },
              {
                id: "yellow",
                name: "Yellow",
                holes: 18,
                par: 72,
                courseRating: 70.9,
                slopeRating: 125,
              },
            ],
          },
          chosen: { [key]: "yellow" },
        })
      );
    });
    await page.goto("/");

    const card = page.getByRole("region", { name: "What you'd need to shoot" });
    await expect(page.getByLabel("Handicap index")).toHaveValue("12.4");
    await expect(card).toContainText("you get 13 shots over 18 holes");
  });

  test("keeps tees saved when a nine hung off its eighteen", async ({ page }) => {
    await freezeClock(page);
    await serveWeather(page);
    await page.addInitScript(() => {
      const key = "St Andrews, Scotland@56.3398,-2.7967";
      localStorage.setItem(
        "golf-weather-watcher-handicap",
        JSON.stringify({
          index: 12.4,
          tees: {
            [key]: [
              {
                id: "white",
                name: "White",
                par: 72,
                courseRating: 72.6,
                slopeRating: 132,
                nine: { par: 36, courseRating: 36.2, slopeRating: 129 },
              },
            ],
          },
          chosen: { [key]: "white" },
        })
      );
    });
    await page.goto("/");

    const card = page.getByRole("region", { name: "What you'd need to shoot" });
    await expect(card).toContainText("you get 15 shots over 18 holes");

    // The nine that was carried on the eighteen is a set of tees of its own.
    await card.getByLabel("Tees").click();
    await page.getByRole("option", { name: "White, 9 holes" }).click();
    await expect(card).toContainText("you get 7 shots over 9 holes");
  });
});
