import type { Page } from "@playwright/test";

import type { HourlyReading, RoundForecast } from "@/lib/forecast";
import type { Place } from "@/lib/places";

/**
 * Weather that never changes.
 *
 * The two services this app talks to answer differently every hour, which is
 * fine for the app and useless for a visual record — a screenshot of a rainy
 * Tuesday can't be compared with one of a sunny Wednesday. Every spec serves
 * these instead, so a difference between two runs is a difference in the app.
 */

const DATE = "2026-09-26";

function hour(at: number, overrides: Partial<HourlyReading> = {}): HourlyReading {
  return {
    time: `${DATE}T${String(at).padStart(2, "0")}:00`,
    temperature: 17.4,
    feelsLike: 15.8,
    humidity: 64,
    dewPoint: 11,
    pressure: 1021,
    windSpeed: 7.2,
    windGust: 11.5,
    windDirection: 245,
    cloudCover: 22,
    rainfall: 0,
    rainChance: 8,
    uvIndex: 3,
    visibility: 24,
    code: 1,
    ...overrides,
  };
}

/** A good afternoon at the Old Course. */
export const FINE: RoundForecast = {
  source: "forecast",
  sunrise: `${DATE}T07:02`,
  sunset: `${DATE}T19:14`,
  hours: [
    hour(13),
    hour(14, { temperature: 18.1, cloudCover: 35, code: 2 }),
    hour(15, { temperature: 17.6, windSpeed: 9.4, cloudCover: 48, code: 2 }),
    hour(16, { temperature: 16.2, windSpeed: 8.1, cloudCover: 30, uvIndex: 1 }),
  ],
};

/** Scotland doing what Scotland does. */
export const FOUL: RoundForecast = {
  source: "forecast",
  sunrise: `${DATE}T07:02`,
  sunset: `${DATE}T19:14`,
  hours: [
    hour(13, { temperature: 6.8, windSpeed: 22, windGust: 41, cloudCover: 100, rainfall: 1.8, rainChance: 95, code: 65, uvIndex: 0, visibility: 3, feelsLike: 1.2 }),
    hour(14, { temperature: 6.1, windSpeed: 24, windGust: 44, cloudCover: 100, rainfall: 2.4, rainChance: 98, code: 82, uvIndex: 0, visibility: 2, feelsLike: 0.4 }),
    hour(15, { temperature: 5.9, windSpeed: 26, windGust: 47, cloudCover: 100, rainfall: 1.1, rainChance: 90, code: 95, uvIndex: 0, visibility: 4, feelsLike: 0.1, pressure: 986 }),
    hour(16, { temperature: 5.7, windSpeed: 21, windGust: 38, cloudCover: 96, rainfall: 0.6, rainChance: 80, code: 61, uvIndex: 0, visibility: 6, feelsLike: 0.6, pressure: 984 }),
  ],
};

/** The archive, which knows what happened but not what was likely. */
export const RECORDED: RoundForecast = {
  source: "archive",
  sunrise: `${DATE}T07:02`,
  sunset: `${DATE}T19:14`,
  hours: FINE.hours.map((reading) => ({
    ...reading,
    rainChance: null,
    uvIndex: null,
    visibility: null,
  })),
};

const PLACES: Place[] = [
  { id: "1", name: "Carnoustie Golf Links", detail: "Angus, Scotland", latitude: 56.4986, longitude: -2.7108, kind: "golf" },
  { id: "2", name: "Carnoustie", detail: "Angus, Scotland", latitude: 56.5, longitude: -2.71, kind: "town" },
];

/** Serves both route handlers from the fixtures above. */
export async function serveWeather(page: Page, forecast: RoundForecast = FINE) {
  await page.route("**/api/forecast**", (route) =>
    route.fulfill({ json: forecast })
  );
  await page.route("**/api/places**", (route) => route.fulfill({ json: PLACES }));
}

/** Seeds the courses this browser has kept, as if they had been starred. */
export async function saveCourses(page: Page, courses: { name: string; latitude: number; longitude: number }[]) {
  await page.addInitScript((saved) => {
    localStorage.setItem("golf-weather-watcher-favourites", JSON.stringify(saved));
  }, courses);
}

/** Serves a failure, for the state where there is no answer to give. */
export async function serveFailure(page: Page, message: string) {
  await page.route("**/api/forecast**", (route) =>
    route.fulfill({ status: 502, json: { error: message } })
  );
}
