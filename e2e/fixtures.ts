import type { Page } from "@playwright/test";

import { OUTLOOK } from "@/lib/config";
import type { HourlyReading, RoundForecast, OutlookForecast } from "@/lib/forecast";
import type { Place } from "@/lib/places";

/**
 * Weather that never changes.
 *
 * The two services this app talks to answer differently every hour, which is
 * fine for the app and useless for a visual record — a screenshot of a rainy
 * Tuesday can't be compared with one of a sunny Wednesday. Every spec serves
 * these instead, so a difference between two runs is a difference in the app.
 */

/**
 * The day everything is photographed on.
 *
 * Frozen so that "today" in the date field, the day names down the outlook and
 * the windows that have already gone are the same in every run — otherwise no
 * two screenshots can be compared.
 */
export const TODAY = "2026-09-26";

const DATE = TODAY;

/** Ten in the morning at a course an hour ahead of UTC. */
export async function freezeClock(page: Page) {
  await page.clock.setFixedTime(new Date(`${TODAY}T09:00:00Z`));
}

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

/** Serves all three route handlers from the fixtures above. */
export async function serveWeather(page: Page, forecast: RoundForecast = FINE) {
  await page.route("**/api/forecast**", (route) =>
    route.fulfill({ json: forecast })
  );
  await page.route("**/api/outlook**", (route) => route.fulfill({ json: FORTNIGHT }));
  await page.route("**/api/places**", (route) => route.fulfill({ json: PLACES }));
}

/**
 * A fortnight at one course, turning from a fine start to a foul middle and
 * back, and settling again.
 *
 * Generated rather than written out: two weeks of hourly weather is several
 * hundred readings, and the point of it is the shape of the fortnight rather
 * than any one hour in it.
 */
function fortnight(): OutlookForecast {
  const days = Array.from({ length: OUTLOOK.days }, (_, offset) => {
    const date = new Date(`${TODAY}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + offset);
    return date.toISOString().slice(0, 10);
  });

  // A run of weather with something of everything in it, so the grid shows
  // each of the three tones and each kind of sky.
  const shape = [
    { temperature: 18, wind: 6, rain: 0, chance: 10, cloud: 20, code: 1 },
    { temperature: 17, wind: 9, rain: 0, chance: 30, cloud: 55, code: 2 },
    { temperature: 13, wind: 16, rain: 0.8, chance: 70, cloud: 85, code: 61 },
    { temperature: 8, wind: 24, rain: 2.6, chance: 95, cloud: 100, code: 82 },
    { temperature: 11, wind: 14, rain: 0.3, chance: 55, cloud: 75, code: 51 },
    { temperature: 15, wind: 8, rain: 0, chance: 20, cloud: 40, code: 2 },
    { temperature: 19, wind: 5, rain: 0, chance: 5, cloud: 10, code: 0 },
    { temperature: 20, wind: 4, rain: 0, chance: 5, cloud: 15, code: 0 },
    { temperature: 16, wind: 11, rain: 0, chance: 35, cloud: 60, code: 2 },
    { temperature: 12, wind: 19, rain: 1.4, chance: 80, cloud: 95, code: 63 },
    { temperature: 9, wind: 27, rain: 3.2, chance: 98, cloud: 100, code: 95 },
    { temperature: 12, wind: 13, rain: 0.2, chance: 45, cloud: 70, code: 51 },
    { temperature: 16, wind: 7, rain: 0, chance: 15, cloud: 35, code: 1 },
    { temperature: 18, wind: 6, rain: 0, chance: 10, cloud: 25, code: 1 },
  ];

  return {
    utcOffsetSeconds: 3600,
    days: days.map((date) => ({
      date,
      sunrise: `${date}T07:02`,
      sunset: `${date}T19:14`,
    })),
    hours: days.flatMap((date, index) => {
      const day = shape[index];
      return Array.from({ length: 24 }, (_, at) =>
        hour(at, {
          time: `${date}T${String(at).padStart(2, "0")}:00`,
          // Coolest before dawn, warmest mid-afternoon.
          temperature: day.temperature - Math.abs(15 - at) * 0.4,
          feelsLike: day.temperature - Math.abs(15 - at) * 0.4 - 2,
          windSpeed: day.wind,
          windGust: day.wind + 5,
          rainfall: day.rain,
          rainChance: day.chance,
          cloudCover: day.cloud,
          code: day.code,
        })
      );
    }),
  };
}

export const FORTNIGHT: OutlookForecast = fortnight();

/** Seeds the courses this browser has kept, as if they had been starred. */
export async function saveCourses(page: Page, courses: { name: string; latitude: number; longitude: number }[]) {
  await page.addInitScript((saved) => {
    localStorage.setItem("golf-weather-watcher-favourites", JSON.stringify(saved));
  }, courses);
}

/**
 * Serves a round that cannot be scored, over a fortnight that can.
 *
 * The date being out of range is a failure of the round and not of the
 * service, so the outlook below it still answers — and it has to be served
 * here too, or the page races a request nothing is standing in for and comes
 * out a different height each run.
 */
export async function serveFailure(page: Page, message: string) {
  await serveWeather(page);
  await page.route("**/api/forecast**", (route) =>
    route.fulfill({ status: 502, json: { error: message } })
  );
}
