import { OUTLOOK, OUTLOOK_HOURS } from "@/lib/config";
import { hourStamp, minutesOfDay, type HourlyReading, type OutlookForecast } from "@/lib/forecast";
import { scoreRound, type RoundScore } from "@/lib/scoring";
import { describeSky, type Sky } from "@/lib/weather-codes";

/**
 * The week ahead, an hour at a time.
 *
 * Each cell is one hour scored on its own conditions, through the same five
 * factors as the round below. That is a different question from the one the
 * round card answers — an hour of drizzle is less rain than four hours of it,
 * so a cell reads higher than a round in the same weather — and the card says
 * so, because two numbers meaning different things is only a problem when
 * nobody is told.
 */

export interface HourCell {
  /** Local at the course: "2026-09-26T15:00". */
  time: string;
  hour: number;
  /** Null when the forecast doesn't reach this hour. */
  reading: HourlyReading | null;
  score: RoundScore | null;
  sky: Sky | null;
  /** The sun is down for the whole hour, so there is nothing to colour. */
  dark: boolean;
  /** Begun or over, by the clock at the course, so no longer a tee time. */
  past: boolean;
}

export interface OutlookDay {
  date: string;
  cells: HourCell[];
}

/**
 * The time it is at the course, as a local timestamp.
 *
 * Built by shifting the instant by the course's offset and then reading it in
 * UTC, which is the one way to get another place's wall clock without a
 * timezone database.
 */
export function courseTime(utcOffsetSeconds: number, now: Date): string {
  const shifted = new Date(now.getTime() + utcOffsetSeconds * 1000);
  return shifted.toISOString().slice(0, 16);
}

export function scoreOutlook(forecast: OutlookForecast, now: Date): OutlookDay[] {
  const byTime = new Map(forecast.hours.map((hour) => [hour.time, hour]));
  const here = courseTime(forecast.utcOffsetSeconds, now);

  return forecast.days.map((day) => ({
    date: day.date,
    cells: OUTLOOK_HOURS.map((hour) => {
      const time = hourStamp(day.date, hour);
      const reading = byTime.get(time) ?? null;
      // Started, not finished: you cannot tee off at two o'clock at half past
      // two, so the hour stops being a choice the moment it begins.
      const past = time <= here;

      const daylight =
        day.sunrise && day.sunset
          ? {
              start: hour * 60,
              end: (hour + 1) * 60,
              sunrise: minutesOfDay(day.sunrise),
              sunset: minutesOfDay(day.sunset),
            }
          : undefined;

      const score =
        reading === null
          ? null
          : scoreRound({
              temperature: reading.temperature,
              windSpeed: reading.windSpeed,
              windGust: reading.windGust ?? reading.windSpeed,
              cloudCover: reading.cloudCover,
              rainfall: reading.rainfall,
              rainChance: reading.rainChance ?? 0,
              daylight,
            });

      return {
        time,
        hour,
        reading,
        score,
        sky: reading === null ? null : describeSky(reading.code),
        // The daylight factor is nought only when the hour is wholly outside
        // it, which is exactly the question being asked here.
        dark:
          score !== null &&
          score.factors.find((factor) => factor.key === "daylight")?.score === 0,
        past,
      };
    }),
  }));
}

/** The best hour of the week, for the line that says where to look. */
export function bestHour(days: OutlookDay[]): HourCell | null {
  let best: { cell: HourCell; overall: number } | null = null;

  for (const day of days) {
    for (const cell of day.cells) {
      const overall = cell.past || cell.dark ? undefined : cell.score?.overall;
      if (overall === undefined) continue;
      if (best === null || overall > best.overall) best = { cell, overall };
    }
  }

  return best === null ? null : best.cell;
}

/** The round the form is set to, so the grid can show where it falls. */
export interface ChosenRound {
  date: string;
  startHour: number;
  length: number;
}

/**
 * The hours of a day the chosen round covers, clipped to the hours drawn.
 *
 * Null when the round is on another day or falls entirely outside them. A
 * round that runs past the last hour is clipped rather than dropped: the part
 * of it on the grid is still the part being asked about.
 */
export function chosenWindow(
  round: ChosenRound,
  date: string
): { firstHour: number; lastHour: number } | null {
  if (round.date !== date) return null;

  const firstHour = Math.max(round.startHour, OUTLOOK.firstHour);
  const lastHour = Math.min(round.startHour + round.length - 1, OUTLOOK.lastHour);

  return lastHour < firstHour ? null : { firstHour, lastHour };
}
