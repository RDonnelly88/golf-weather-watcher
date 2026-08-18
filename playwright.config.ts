import { defineConfig, devices } from "@playwright/test";

/**
 * Its own port and its own server, so a run never lands on whatever dev server
 * happens to be up.
 */
const PORT = process.env.E2E_PORT ?? "3100";
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

/**
 * A machine that already has a Chromium — a CI image, a container — can point
 * at it rather than have Playwright fetch a second copy of the same browser.
 */
const executablePath = process.env.CHROMIUM_PATH;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],

  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "en-GB",
    timezoneId: "Europe/London",
    /**
     * Playwright won't act on an element until its box holds still, and the
     * score ring, the count-up and the loading sheen all move. Standing them
     * down removes a class of timeout and stops the visual record catching a
     * gauge halfway round.
     */
    contextOptions: { reducedMotion: "reduce" },
  },

  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        launchOptions: { executablePath },
      },
    },
    /**
     * A phone-shaped window rather than an emulated phone.
     *
     * The device descriptors change the layout viewport as well as its size,
     * which leaves `innerHeight` at nearly twice the configured height and
     * Playwright hit-testing a tap against the wrong element. The thing being
     * checked here is how the page lays out at four hundred pixels, and that
     * is the same either way. Touch stays on, so nothing can quietly come to
     * depend on hovering.
     */
    {
      name: "phone",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 412, height: 900 },
        hasTouch: true,
        launchOptions: { executablePath },
      },
    },
  ],

  webServer: {
    command: `next dev --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
