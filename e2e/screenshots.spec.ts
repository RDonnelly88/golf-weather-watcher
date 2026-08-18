import fs from "node:fs";
import { test, type Page } from "@playwright/test";

import {
  FINE,
  FOUL,
  RECORDED,
  freezeClock,
  saveCourses,
  saveHandicap,
  serveFailure,
  serveWeather,
} from "./fixtures";

/**
 * The visual record. Not assertions — a folder of screenshots to look at.
 *
 * `npm run e2e:shots` writes every state of the page at the running project's
 * viewport, in both themes. Reviewing a design change means opening these,
 * which is the only way to catch something that is technically rendering and
 * visually wrong.
 */

const dir = (project: string) => `e2e/screenshots/${project}`;

async function shot(page: Page, project: string, name: string) {
  fs.mkdirSync(dir(project), { recursive: true });

  /*
   * Clipped to the width of the page rather than left to `fullPage` alone.
   * A horizontally scrolling panel — the heatmap — leaves layout overflow that
   * `documentElement.scrollWidth` counts even though the document itself does
   * not scroll, and a full-page shot sized from that number is the page with a
   * fat empty margin down one side.
   */
  const page_size = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    height: document.documentElement.scrollHeight,
  }));

  await page.screenshot({
    path: `${dir(project)}/${name}.png`,
    fullPage: true,
    clip: { x: 0, y: 0, ...page_size },
  });
}

/** Flip the theme the same way the toggle does, without needing it on screen. */
async function setTheme(page: Page, theme: "light" | "dark") {
  await freezeClock(page);
  await page.emulateMedia({ colorScheme: theme });
  await page.addInitScript((choice) => {
    localStorage.setItem("golf-weather-theme", choice);
  }, theme);
}

/**
 * Waits for the page to have something on it.
 *
 * A fixed pause is not enough: the suite starts a cold dev server, so the first
 * visit compiles the route on demand and a screenshot taken during that is a
 * picture of an empty page — which passes, because nothing here asserts.
 */
async function settled(page: Page) {
  await page.getByRole("heading", { name: "Hour by hour" }).waitFor({ timeout: 60_000 });
  await page.waitForLoadState("networkidle").catch(() => {});
}

for (const theme of ["light", "dark"] as const) {
  test(`the round, forecast — ${theme}`, async ({ page }, info) => {
    await setTheme(page, theme);
    await serveWeather(page, FINE);
    await page.goto("/");
    await settled(page);
    await shot(page, info.project.name, `01-fine-${theme}`);
  });

  test(`the round, foul — ${theme}`, async ({ page }, info) => {
    await setTheme(page, theme);
    await serveWeather(page, FOUL);
    await page.goto("/");
    await settled(page);
    await shot(page, info.project.name, `02-foul-${theme}`);
  });

  test(`an hour, opened — ${theme}`, async ({ page }, info) => {
    await setTheme(page, theme);
    await serveWeather(page, FINE);
    await page.goto("/");
    await settled(page);
    // Anchored, so it can't also match a heatmap cell at one o'clock.
    await page.getByRole("button", { name: /^13:00 / }).click();
    await page.getByRole("button", { name: /Bands/ }).first().click();
    await shot(page, info.project.name, `03-opened-${theme}`);
  });

  test(`the course picker — ${theme}`, async ({ page }, info) => {
    await setTheme(page, theme);
    await serveWeather(page, FINE);
    await page.goto("/");
    await settled(page);
    await page.getByLabel("Course", { exact: true }).click();
    await shot(page, info.project.name, `04-courses-${theme}`);
  });

  test(`saved courses — ${theme}`, async ({ page }, info) => {
    await setTheme(page, theme);
    await serveWeather(page, FINE);
    await saveCourses(page, [
      { name: "Machrihanish Dunes", latitude: 55.4325, longitude: -5.7167 },
      { name: "Prestwick, Scotland", latitude: 55.4956, longitude: -4.6136 },
    ]);
    await page.goto("/");
    await settled(page);
    await page.getByLabel("Course", { exact: true }).click();
    await shot(page, info.project.name, `04b-saved-${theme}`);
  });

  test(`the date picker — ${theme}`, async ({ page }, info) => {
    await setTheme(page, theme);
    await serveWeather(page, FINE);
    await page.goto("/");
    await settled(page);
    await page.getByLabel("Date").click();
    await shot(page, info.project.name, `05-dates-${theme}`);
  });

  test(`what happened, from the archive — ${theme}`, async ({ page }, info) => {
    await setTheme(page, theme);
    await serveWeather(page, RECORDED);
    await page.goto("/");
    await settled(page);
    await shot(page, info.project.name, `06-recorded-${theme}`);
  });

  test(`the fortnight ahead — ${theme}`, async ({ page }, info) => {
    await setTheme(page, theme);
    await serveWeather(page, FINE);
    await page.goto("/");
    await settled(page);
    await page.getByRole("heading", { name: "The fortnight ahead" }).scrollIntoViewIfNeeded();
    await shot(page, info.project.name, `08-outlook-${theme}`);
  });

  test(`an hour in the fortnight, picked out — ${theme}`, async ({ page }, info) => {
    await setTheme(page, theme);
    await serveWeather(page, FINE);
    await page.goto("/");
    await settled(page);
    const week = page.getByRole("region", { name: "The fortnight ahead" });
    await page.getByRole("heading", { name: "The fortnight ahead" }).scrollIntoViewIfNeeded();
    await week.getByRole("button", { name: /14:00 on Tuesday 29 September/ }).click();
    await shot(page, info.project.name, `09-outlook-open-${theme}`);
  });

  test(`what you'd need to shoot — ${theme}`, async ({ page }, info) => {
    await setTheme(page, theme);
    await serveWeather(page, FINE);
    await saveHandicap(page);
    await page.goto("/");
    await settled(page);
    await page.getByRole("heading", { name: "What you'd need to shoot" }).scrollIntoViewIfNeeded();
    await shot(page, info.project.name, `10-handicap-${theme}`);
  });

  test(`what you'd need over nine — ${theme}`, async ({ page }, info) => {
    await setTheme(page, theme);
    await serveWeather(page, FINE);
    await saveHandicap(page);
    await page.goto("/");
    await settled(page);
    const card = page.getByRole("region", { name: "What you'd need to shoot" });
    await page.getByRole("heading", { name: "What you'd need to shoot" }).scrollIntoViewIfNeeded();
    await card.getByRole("radio", { name: "9 holes" }).click();
    await shot(page, info.project.name, `10b-handicap-nine-${theme}`);
  });

  test(`the tees off the card — ${theme}`, async ({ page }, info) => {
    await setTheme(page, theme);
    await serveWeather(page, FINE);
    await saveHandicap(page);
    await page.goto("/");
    await settled(page);
    await page.getByRole("heading", { name: "What you'd need to shoot" }).scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "Edit" }).click();
    await shot(page, info.project.name, `10c-handicap-tees-${theme}`);
  });

  test(`no handicap yet — ${theme}`, async ({ page }, info) => {
    await setTheme(page, theme);
    await serveWeather(page, FINE);
    await page.goto("/");
    await settled(page);
    await page.getByRole("heading", { name: "What you'd need to shoot" }).scrollIntoViewIfNeeded();
    await shot(page, info.project.name, `11-handicap-empty-${theme}`);
  });

  test(`nothing to score — ${theme}`, async ({ page }, info) => {
    await setTheme(page, theme);
    await serveFailure(page, "That date is beyond what the forecast covers.");
    await page.goto("/");
    await page.getByRole("heading", { name: "No score for that round" }).waitFor({
      timeout: 60_000,
    });
    await shot(page, info.project.name, `07-no-score-${theme}`);
  });
}
