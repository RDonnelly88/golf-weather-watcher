import { OUTLOOK, type SlotKey } from "@/lib/config";
import {
  hourStamp,
  roundHours,
  summariseRound,
  type HourlyReading,
  type WeekForecast,
} from "@/lib/forecast";
import { scoreRound, type RoundScore } from "@/lib/scoring";
import { dominantSky, type SkyKind } from "@/lib/weather-codes";

/**
 * The week ahead, scored.
 *
 * Twenty-one windows through the same model that scores the round below them,
 * so a slot reading 82 here and the round reading 82 there mean exactly the
 * same thing. Nothing new is decided about what good weather is.
 */

export interface ScoredSlot {
  key: SlotKey;
  label: string;
  startHour: number;
  /** Null when the window has no weather: past the end of the forecast, or already gone. */
  score: RoundScore | null;
  hours: HourlyReading[];
  sky: SkyKind | null;
  /** Already been and gone, by the clock at the course. */
  past: boolean;
}

export interface OutlookDay {
  date: string;
  slots: ScoredSlot[];
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

export function scoreOutlook(
  forecast: WeekForecast,
  length: number,
  now: Date
): OutlookDay[] {
  const byTime = new Map(forecast.hours.map((hour) => [hour.time, hour]));
  const here = courseTime(forecast.utcOffsetSeconds, now);

  return forecast.days.map((day) => ({
    date: day.date,
    slots: OUTLOOK.slots.map((slot) => {
      const hours = roundHours({
        date: day.date,
        startHour: slot.startHour,
        length,
      }).flatMap((time) => {
        const found = byTime.get(time);
        return found ? [found] : [];
      });

      // The window has to be whole. Half a round at the end of the forecast
      // scores the half it has and reads like a verdict on all of it.
      const complete = hours.length === length;
      const past = hourStamp(day.date, slot.startHour + length) <= here;

      return {
        key: slot.key,
        label: slot.label,
        startHour: slot.startHour,
        hours,
        sky: complete ? dominantSky(hours.map((hour) => hour.code)) : null,
        past,
        score:
          complete && !past
            ? scoreRound(
                summariseRound(
                  {
                    hours,
                    sunrise: day.sunrise,
                    sunset: day.sunset,
                    source: "forecast",
                  },
                  { startHour: slot.startHour, length }
                )
              )
            : null,
      };
    }),
  }));
}

/** The best window of the week, for the line that says where to look. */
export function bestSlot(
  days: OutlookDay[]
): { date: string; slot: ScoredSlot } | null {
  let best: { date: string; slot: ScoredSlot; overall: number } | null = null;

  for (const day of days) {
    for (const slot of day.slots) {
      const overall = slot.score?.overall;
      if (overall === undefined) continue;
      if (best === null || overall > best.overall) {
        best = { date: day.date, slot, overall };
      }
    }
  }

  return best === null ? null : { date: best.date, slot: best.slot };
}
