import { addDays, format, parseISO } from "date-fns";

import type { RoundConditions } from "@/lib/scoring";

/**
 * One hour of the round.
 *
 * Times are local to the course and carry no offset — "2026-09-26T13:00" is
 * one o'clock where you are teeing off, whatever the clock says on the device
 * asking. Everything downstream compares them as the strings they are, so a
 * round is never quietly shifted into the reader's own timezone.
 *
 * The nullable fields are the ones the archive doesn't carry: reanalysis knows
 * what the weather did, not what was thought likely at the time, and it has no
 * UV index or visibility.
 */
export interface HourlyReading {
  time: string;
  /** °C */
  temperature: number;
  /** °C */
  feelsLike: number;
  /** % */
  humidity: number;
  /** °C */
  dewPoint: number | null;
  /** hPa */
  pressure: number;
  /** mph */
  windSpeed: number;
  /** mph */
  windGust: number | null;
  /** Degrees the wind blows from. */
  windDirection: number;
  /** % */
  cloudCover: number;
  /** mm */
  rainfall: number;
  /** % */
  rainChance: number | null;
  uvIndex: number | null;
  /** km */
  visibility: number | null;
  /** WMO code — see lib/weather-codes.ts */
  code: number;
}

export interface RoundForecast {
  hours: HourlyReading[];
  /** Local time at the course, or null when the day carried none. */
  sunrise: string | null;
  sunset: string | null;
  /**
   * Which model answered. The archive is what the weather actually did; the
   * forecast is what is expected of it. Worth saying on screen, because they
   * are different claims.
   */
  source: "forecast" | "archive";
}

/** One day of the week ahead, and when the sun is up on it. */
interface DayLight {
  date: string;
  sunrise: string | null;
  sunset: string | null;
}

/**
 * Several days of weather in one answer.
 *
 * Fetched whole rather than a window at a time: the outlook asks the same
 * question of twenty-one windows across seven days, and twenty-one calls for
 * one location's week is a lot of asking for data that arrives together.
 */
export interface WeekForecast {
  days: DayLight[];
  hours: HourlyReading[];
  /**
   * Seconds the course is ahead of UTC. Carried because "has that slot been
   * and gone" is a question about the clock at the course, not the clock on
   * the device asking — a morning in Auckland is not over because it is
   * evening in Fife.
   */
  utcOffsetSeconds: number;
}

/** What was asked for: a date, a tee time and a length. */
export interface RoundRequest {
  latitude: number;
  longitude: number;
  /** yyyy-MM-dd, the calendar date at the course. */
  date: string;
  /** 0–23, local to the course. */
  startHour: number;
  /** Whole hours. */
  length: number;
}

/**
 * The local timestamp of an hour counted from a date's midnight.
 *
 * Hours past twenty-three roll into the next day, which is what makes a round
 * that runs past midnight expressible at all.
 */
export function hourStamp(date: string, hour: number): string {
  const day = format(addDays(parseISO(date), Math.floor(hour / 24)), "yyyy-MM-dd");
  return `${day}T${String(hour % 24).padStart(2, "0")}:00`;
}

/**
 * The local timestamps a round covers, in order.
 *
 * Built from the request rather than by counting into the response's arrays,
 * which would rest on the API returning exactly twenty-four rows starting at
 * midnight — true of every day until a round runs past one.
 */
export function roundHours(request: Pick<RoundRequest, "date" | "startHour" | "length">): string[] {
  return Array.from({ length: request.length }, (_, i) =>
    hourStamp(request.date, request.startHour + i)
  );
}

/** The last calendar date a round touches, which is what the API is asked for. */
export function lastDay(request: Pick<RoundRequest, "date" | "startHour" | "length">): string {
  const hours = roundHours(request);
  return hours[hours.length - 1].slice(0, 10);
}

/** Minutes from midnight, from a local "…THH:mm" timestamp. */
export function minutesOfDay(timestamp: string): number {
  const [hours, minutes] = timestamp.slice(11, 16).split(":").map(Number);
  return hours * 60 + minutes;
}

function mean(values: number[]): number {
  return values.length === 0
    ? 0
    : values.reduce((total, value) => total + value, 0) / values.length;
}

/**
 * The round as one set of conditions for the scorer.
 *
 * Averages for the things you feel throughout and a total for the rain, which
 * is the one that accumulates. The gust is the worst of the round rather than
 * the mean, because one squall on the seventeenth is what you remember.
 */
export function summariseRound(
  forecast: RoundForecast,
  request: Pick<RoundRequest, "startHour" | "length">
): RoundConditions {
  const { hours } = forecast;
  const chances = hours
    .map((hour) => hour.rainChance)
    .filter((chance): chance is number => chance !== null);

  const start = request.startHour * 60;
  const end = start + request.length * 60;

  return {
    temperature: mean(hours.map((hour) => hour.temperature)),
    windSpeed: mean(hours.map((hour) => hour.windSpeed)),
    windGust: Math.max(
      0,
      ...hours.map((hour) => hour.windGust ?? hour.windSpeed)
    ),
    cloudCover: mean(hours.map((hour) => hour.cloudCover)),
    rainfall: hours.reduce((total, hour) => total + hour.rainfall, 0),
    rainChance: mean(chances),
    daylight:
      forecast.sunrise && forecast.sunset
        ? {
            start,
            end,
            sunrise: minutesOfDay(forecast.sunrise),
            sunset: minutesOfDay(forecast.sunset),
          }
        : undefined,
  };
}

/**
 * When the round ends, and whether that is still the same day.
 *
 * A tee time of 22:00 and a four-hour round finishes at 02:00 — worth saying
 * out loud, because a clock reading 02:00 under a date reading yesterday is
 * the sort of thing nobody reads twice.
 */
export function finishTime(
  teeTime: string,
  length: number
): { clock: string; nextDay: boolean } {
  const [hours, minutes] = teeTime.split(":").map(Number);
  const finish = hours + length;

  return {
    clock: `${String(finish % 24).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
    nextDay: finish >= 24,
  };
}
