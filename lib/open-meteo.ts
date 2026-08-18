import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { z } from "zod";

import { FORECAST } from "@/lib/config";
import {
  lastDay,
  roundHours,
  type HourlyReading,
  type RoundForecast,
  type RoundRequest,
  type WeekForecast,
} from "@/lib/forecast";

/**
 * Open-Meteo, which is free, needs no key and asks for no attribution beyond
 * the licence. Called from the route handler rather than the browser, so the
 * query is built in one place and the response is validated before anything
 * renders it.
 */

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";

/**
 * What each model can be asked for.
 *
 * Reanalysis has no notion of a probability — it is a record of what happened,
 * so the chance of rain was either nought or a hundred — and carries neither
 * UV index nor visibility. Asking for them turns the whole request into an
 * error rather than an omission, so the two lists differ.
 */
const COMMON_HOURLY = [
  "temperature_2m",
  "apparent_temperature",
  "relative_humidity_2m",
  "dew_point_2m",
  "pressure_msl",
  "wind_speed_10m",
  "wind_gusts_10m",
  "wind_direction_10m",
  "cloud_cover",
  "precipitation",
  "weather_code",
];

const FORECAST_ONLY_HOURLY = [
  "precipitation_probability",
  "uv_index",
  "visibility",
];

const numbers = z.array(z.number().nullable());

const ResponseSchema = z.object({
  hourly: z.object({
    time: z.array(z.string()),
    temperature_2m: numbers,
    apparent_temperature: numbers.optional(),
    relative_humidity_2m: numbers.optional(),
    dew_point_2m: numbers.optional(),
    pressure_msl: numbers.optional(),
    wind_speed_10m: numbers,
    wind_gusts_10m: numbers.optional(),
    wind_direction_10m: numbers.optional(),
    cloud_cover: numbers,
    precipitation: numbers.optional(),
    weather_code: numbers.optional(),
    precipitation_probability: numbers.optional(),
    uv_index: numbers.optional(),
    visibility: numbers.optional(),
  }),
  daily: z
    .object({
      time: z.array(z.string()).optional(),
      sunrise: z.array(z.string()).optional(),
      sunset: z.array(z.string()).optional(),
    })
    .optional(),
  utc_offset_seconds: z.number().optional(),
});

type Parsed = z.infer<typeof ResponseSchema>;

const ErrorSchema = z.object({ reason: z.string() });

/** Thrown for anything the caller could sensibly report to the reader. */
export class ForecastError extends Error {}

/**
 * Which model holds the day.
 *
 * The forecast endpoint keeps a few days of the recent past; beyond that only
 * the archive has it. The archive runs several days behind the present, which
 * is why the two overlap rather than meeting at today.
 */
export function sourceFor(date: string, today = new Date()): "forecast" | "archive" {
  const daysAway = differenceInCalendarDays(parseISO(date), today);
  return daysAway < -FORECAST.archiveOlderThanDays ? "archive" : "forecast";
}

function reading(
  time: string,
  index: number,
  hourly: z.infer<typeof ResponseSchema>["hourly"]
): HourlyReading {
  const at = (values: (number | null)[] | undefined): number | null =>
    values?.[index] ?? null;

  const temperature = at(hourly.temperature_2m) ?? 0;
  const windSpeed = at(hourly.wind_speed_10m) ?? 0;
  const visibilityMetres = at(hourly.visibility);

  return {
    time,
    temperature,
    // Apparent temperature is the one that decides what you wear, so falling
    // back to the dry-bulb reading is a last resort rather than a default.
    feelsLike: at(hourly.apparent_temperature) ?? temperature,
    humidity: at(hourly.relative_humidity_2m) ?? 0,
    dewPoint: at(hourly.dew_point_2m),
    pressure: at(hourly.pressure_msl) ?? 0,
    windSpeed,
    windGust: at(hourly.wind_gusts_10m),
    windDirection: at(hourly.wind_direction_10m) ?? 0,
    cloudCover: at(hourly.cloud_cover) ?? 0,
    rainfall: at(hourly.precipitation) ?? 0,
    rainChance: at(hourly.precipitation_probability),
    uvIndex: at(hourly.uv_index),
    visibility: visibilityMetres === null ? null : visibilityMetres / 1000,
    code: at(hourly.weather_code) ?? 0,
  };
}

/**
 * One request to whichever model holds the days asked for.
 *
 * Everything about talking to Open-Meteo is here — which endpoint, which
 * variables, which units — so a second kind of question is a second way of
 * reading the answer rather than a second copy of the query.
 */
async function fetchHourly(
  request: {
    latitude: number;
    longitude: number;
    startDate: string;
    endDate: string;
    source: "forecast" | "archive";
  },
  signal?: AbortSignal
): Promise<Parsed> {
  const params = new URLSearchParams({
    latitude: String(request.latitude),
    longitude: String(request.longitude),
    hourly: [
      ...COMMON_HOURLY,
      ...(request.source === "forecast" ? FORECAST_ONLY_HOURLY : []),
    ].join(","),
    daily: "sunrise,sunset",
    start_date: request.startDate,
    end_date: request.endDate,
    // Local to the course, which is the only clock a tee time means anything on.
    timezone: "auto",
    wind_speed_unit: "mph",
  });

  const response = await fetch(
    `${request.source === "archive" ? ARCHIVE_URL : FORECAST_URL}?${params}`,
    { signal, headers: { accept: "application/json" } }
  );

  const body: unknown = await response.json();

  if (!response.ok) {
    const parsed = ErrorSchema.safeParse(body);
    throw new ForecastError(
      parsed.success ? parsed.data.reason : "The weather service is unavailable."
    );
  }

  const parsed = ResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw new ForecastError("The weather service sent something unreadable.");
  }

  return parsed.data;
}

/** Every hour in the response, keyed by its local timestamp. */
function readings(hourly: Parsed["hourly"]): Map<string, HourlyReading> {
  return new Map(
    hourly.time.map((time, index) => [time, reading(time, index, hourly)])
  );
}

/**
 * The hours of one round, from whichever model holds the day.
 *
 * The response is asked for whole days and then narrowed to the round by
 * matching timestamps, so a round that runs past midnight keeps every hour of
 * itself.
 */
export async function fetchRound(
  request: RoundRequest,
  signal?: AbortSignal
): Promise<RoundForecast> {
  const source = sourceFor(request.date);
  const data = await fetchHourly(
    {
      latitude: request.latitude,
      longitude: request.longitude,
      startDate: request.date,
      endDate: lastDay(request),
      source,
    },
    signal
  );

  const byTime = readings(data.hourly);
  const hours = roundHours(request).flatMap((time) => {
    const found = byTime.get(time);
    return found ? [found] : [];
  });

  if (hours.length === 0) {
    // Nothing fabricated in place of an answer: a made-up round reads exactly
    // like a real one and there is no way for the reader to tell.
    throw new ForecastError("No weather is available for that date and time.");
  }

  return {
    hours,
    sunrise: data.daily?.sunrise?.[0] ?? null,
    sunset: data.daily?.sunset?.[0] ?? null,
    source,
  };
}

/**
 * A run of whole days at one place, for the outlook.
 *
 * Always the forecast model: the week ahead is the only week it is asked
 * about.
 */
export async function fetchWeek(
  request: { latitude: number; longitude: number; days: number },
  signal?: AbortSignal,
  today = new Date()
): Promise<WeekForecast> {
  const start = format(today, "yyyy-MM-dd");
  const data = await fetchHourly(
    {
      latitude: request.latitude,
      longitude: request.longitude,
      startDate: start,
      endDate: format(addDays(today, request.days - 1), "yyyy-MM-dd"),
      source: "forecast",
    },
    signal
  );

  const days = (data.daily?.time ?? []).map((date, index) => ({
    date,
    sunrise: data.daily?.sunrise?.[index] ?? null,
    sunset: data.daily?.sunset?.[index] ?? null,
  }));

  if (days.length === 0) {
    throw new ForecastError("No outlook is available for that course.");
  }

  return {
    days,
    hours: [...readings(data.hourly).values()],
    utcOffsetSeconds: data.utc_offset_seconds ?? 0,
  };
}
