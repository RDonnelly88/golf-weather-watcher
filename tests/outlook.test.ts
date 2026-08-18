import { describe, expect, it } from "vitest";

import { OUTLOOK } from "@/lib/config";
import type { HourlyReading, WeekForecast } from "@/lib/forecast";
import { bestSlot, courseTime, scoreOutlook } from "@/lib/outlook";
import { dominantSky } from "@/lib/weather-codes";

function hour(time: string, overrides: Partial<HourlyReading> = {}): HourlyReading {
  return {
    time,
    temperature: 17,
    feelsLike: 16,
    humidity: 60,
    dewPoint: 10,
    pressure: 1020,
    windSpeed: 6,
    windGust: 9,
    windDirection: 250,
    cloudCover: 20,
    rainfall: 0,
    rainChance: 5,
    uvIndex: 3,
    visibility: 20,
    code: 1,
    ...overrides,
  };
}

/** Two whole days of hourly weather, so every slot of day one is complete. */
function week(
  dates: string[],
  overrides: (date: string, at: number) => Partial<HourlyReading> = () => ({})
): WeekForecast {
  return {
    utcOffsetSeconds: 3600,
    days: dates.map((date) => ({
      date,
      sunrise: `${date}T06:00`,
      sunset: `${date}T21:00`,
    })),
    hours: dates.flatMap((date) =>
      Array.from({ length: 24 }, (_, at) =>
        hour(`${date}T${String(at).padStart(2, "0")}:00`, overrides(date, at))
      )
    ),
  };
}

/** Before any of the windows on the first day have started. */
const EARLY = new Date("2026-06-01T00:30:00Z");

describe("the clock at the course", () => {
  it("reads the course's wall clock, not the reader's", () => {
    // Midnight UTC is midday in New Zealand.
    expect(courseTime(12 * 3600, new Date("2026-06-01T00:00:00Z"))).toBe(
      "2026-06-01T12:00"
    );
  });

  it("goes back a day when the course is behind", () => {
    expect(courseTime(-5 * 3600, new Date("2026-06-01T02:00:00Z"))).toBe(
      "2026-05-31T21:00"
    );
  });
});

describe("scoring the week", () => {
  const days = scoreOutlook(week(["2026-06-01", "2026-06-02"]), 4, EARLY);

  it("gives every day the same three windows", () => {
    expect(days).toHaveLength(2);
    for (const day of days) {
      expect(day.slots.map((slot) => slot.key)).toEqual(
        OUTLOOK.slots.map((slot) => slot.key)
      );
    }
  });

  it("scores each window through the same model as the round", () => {
    const morning = days[0].slots[0];
    expect(morning.score?.overall).toBeGreaterThan(90);
    expect(morning.hours).toHaveLength(4);
  });

  it("scores a foul window below a fair one", () => {
    const foul = scoreOutlook(
      week(["2026-06-01"], (_, at) =>
        at >= 12 && at < 16
          ? { rainfall: 3, rainChance: 95, windSpeed: 25, temperature: 5, cloudCover: 100 }
          : {}
      ),
      4,
      EARLY
    );

    const [morning, afternoon] = foul[0].slots;
    expect(afternoon.score!.overall).toBeLessThan(morning.score!.overall);
  });

  it("leaves a window with no weather unscored rather than scoring what it has", () => {
    // A day whose evening hours the forecast doesn't reach.
    const short: WeekForecast = {
      ...week(["2026-06-01"]),
      hours: week(["2026-06-01"]).hours.filter(
        (reading) => Number(reading.time.slice(11, 13)) < 18
      ),
    };

    const evening = scoreOutlook(short, 4, EARLY)[0].slots[2];
    expect(evening.score).toBeNull();
    expect(evening.sky).toBeNull();
  });

  it("marks a window that has already finished, by the course's clock", () => {
    // 13:30 UTC is 14:30 at a course an hour ahead: the morning has gone and
    // the afternoon has not.
    const midday = scoreOutlook(
      week(["2026-06-01"]),
      4,
      new Date("2026-06-01T13:30:00Z")
    )[0];

    expect(midday.slots[0].past).toBe(true);
    expect(midday.slots[0].score).toBeNull();
    expect(midday.slots[1].past).toBe(false);
    expect(midday.slots[1].score).not.toBeNull();
  });

  it("re-scores rather than re-asks when the round gets longer", () => {
    const forecast = week(["2026-06-01"]);
    const short = scoreOutlook(forecast, 2, EARLY)[0].slots[0];
    const long = scoreOutlook(forecast, 6, EARLY)[0].slots[0];

    expect(short.hours).toHaveLength(2);
    expect(long.hours).toHaveLength(6);
  });
});

describe("the pick of the week", () => {
  it("finds the highest-scoring window anywhere in it", () => {
    const forecast = week(["2026-06-01", "2026-06-02"], (date, at) =>
      date === "2026-06-02" && at >= 12 && at < 16 ? {} : { cloudCover: 95 }
    );

    const best = bestSlot(scoreOutlook(forecast, 4, EARLY));
    expect(best?.date).toBe("2026-06-02");
    expect(best?.slot.key).toBe("afternoon");
  });

  it("has nothing to say about a week with no scored windows", () => {
    expect(bestSlot([])).toBeNull();
  });
});

describe("the sky a window is remembered by", () => {
  it("takes the worst hour, not the commonest", () => {
    // Three clear hours and one thunderstorm is a thundery afternoon.
    expect(dominantSky([0, 0, 0, 95])).toBe("thunderstorm");
    expect(dominantSky([1, 2, 61])).toBe("rain");
  });

  it("falls back when there is nothing to go on", () => {
    expect(dominantSky([])).toBe("cloudy");
  });
});
