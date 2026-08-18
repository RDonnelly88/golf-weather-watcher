import { expect, test } from "@playwright/test";

import { serveWeather } from "./fixtures";

/**
 * Keeping a course is the one thing in the app that outlives the page, so it
 * is the one thing worth driving a browser to check.
 */
test.describe("saved courses", () => {
  test("a saved course survives a reload and can be unsaved again", async ({ page }) => {
    await serveWeather(page);
    await page.goto("/");

    const save = page.getByRole("button", { name: "Save to your courses" });
    await save.click();
    await page.reload();

    // Still saved after the reload: the control now offers to take it away.
    const remove = page.getByRole("button", { name: "Remove from your courses" });
    await expect(remove).toBeVisible();

    await page.getByLabel("Course", { exact: true }).click();
    const yours = page.getByRole("group", { name: "Your courses" });
    await expect(yours.getByRole("option")).toHaveText([/St Andrews/]);
    await page.keyboard.press("Escape");

    await remove.click();
    await page.reload();
    await expect(page.getByRole("button", { name: "Save to your courses" })).toBeVisible();

    await page.getByLabel("Course", { exact: true }).click();
    await expect(page.getByRole("group", { name: "Your courses" })).toHaveCount(0);
  });
});
