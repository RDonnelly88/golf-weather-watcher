import fs from "node:fs";
import { test, type Page } from "@playwright/test";

import { FINE, FOUL, RECORDED, serveFailure, serveWeather } from "./fixtures";

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
  await page.screenshot({ path: `${dir(project)}/${name}.png`, fullPage: true });
}

/** Flip the theme the same way the toggle does, without needing it on screen. */
async function setTheme(page: Page, theme: "light" | "dark") {
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
    await page.getByRole("button", { name: /13:00/ }).click();
    await page.getByRole("button", { name: /Bands/ }).first().click();
    await shot(page, info.project.name, `03-opened-${theme}`);
  });

  test(`the course picker — ${theme}`, async ({ page }, info) => {
    await setTheme(page, theme);
    await serveWeather(page, FINE);
    await page.goto("/");
    await settled(page);
    await page.getByLabel("Course").click();
    await shot(page, info.project.name, `04-courses-${theme}`);
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
