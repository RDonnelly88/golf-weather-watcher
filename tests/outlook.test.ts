import { describe, expect, it } from "vitest";

import { OUTLOOK_HOURS } from "@/lib/config";
import type { HourlyReading, OutlookForecast } from "@/lib/forecast";
import { bestHour, chosenWindow, courseTime, scoreOutlook } from "@/lib/outlook";
import { heatBand, toneFor } from "@/lib/scoring";
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

/** Whole days of hourly weather, with the sun up from six until nine. */
function forecastFor(
  dates: string[],
  overrides: (date: string, at: number) => Partial<HourlyReading> = () => ({})
): OutlookForecast {
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

/** Before any of the first day's hours have been and gone. */
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

describe("the grid", () => {
  const days = scoreOutlook(forecastFor(["2026-06-01", "2026-06-02"]), EARLY);

  it("gives every day the same run of hours", () => {
    expect(days).toHaveLength(2);
    for (const day of days) {
      expect(day.cells.map((cell) => cell.hour)).toEqual(OUTLOOK_HOURS);
    }
  });

  it("scores each hour on its own conditions", () => {
    const midday = days[0].cells.find((cell) => cell.hour === 12);
    expect(midday?.score?.overall).toBeGreaterThan(90);
    expect(midday?.reading?.time).toBe("2026-06-01T12:00");
  });

  it("scores a foul hour below a fair one on the same day", () => {
    const foul = scoreOutlook(
      forecastFor(["2026-06-01"], (_, at) =>
        at === 15
          ? { rainfall: 3, rainChance: 95, windSpeed: 25, temperature: 5, cloudCover: 100 }
          : {}
      ),
      EARLY
    )[0];

    const bad = foul.cells.find((cell) => cell.hour === 15);
    const good = foul.cells.find((cell) => cell.hour === 14);
    expect(bad!.score!.overall).toBeLessThan(good!.score!.overall);
  });

  it("leaves an hour the forecast doesn't reach unscored", () => {
    const forecast = forecastFor(["2026-06-01"]);
    const short: OutlookForecast = {
      ...forecast,
      hours: forecast.hours.filter(
        (reading) => Number(reading.time.slice(11, 13)) < 18
      ),
    };

    const evening = scoreOutlook(short, EARLY)[0].cells.find(
      (cell) => cell.hour === 19
    );
    expect(evening?.score).toBeNull();
    expect(evening?.sky).toBeNull();
  });

  it("marks an hour that has been and gone, by the course's clock", () => {
    // 13:30 UTC is 14:30 at a course an hour ahead: two o'clock has gone and
    // three has not.
    const day = scoreOutlook(forecastFor(["2026-06-01"]), new Date("2026-06-01T13:30:00Z"))[0];

    expect(day.cells.find((cell) => cell.hour === 14)?.past).toBe(true);
    expect(day.cells.find((cell) => cell.hour === 15)?.past).toBe(false);
  });

  it("still scores an hour that has gone, so the shape of the day survives", () => {
    const day = scoreOutlook(forecastFor(["2026-06-01"]), new Date("2026-06-01T13:30:00Z"))[0];
    expect(day.cells.find((cell) => cell.hour === 8)?.score).not.toBeNull();
  });
});

describe("darkness", () => {
  // Sun up from 06:00 to 21:00, so 22:00 is outside it and 20:00 is not.
  const day = scoreOutlook(forecastFor(["2026-06-01"]), EARLY)[0];

  it("marks an hour outside the daylight", () => {
    expect(day.cells.find((cell) => cell.hour === 22)?.dark).toBe(true);
    expect(day.cells.find((cell) => cell.hour === 20)?.dark).toBe(false);
  });

  it("marks the hour before sunrise on a short winter day", () => {
    const winter: OutlookForecast = {
      ...forecastFor(["2026-12-01"]),
      days: [{ date: "2026-12-01", sunrise: "2026-12-01T08:44", sunset: "2026-12-01T15:38" }],
    };

    const cells = scoreOutlook(winter, new Date("2026-11-30T00:00:00Z"))[0].cells;
    expect(cells.find((cell) => cell.hour === 7)?.dark).toBe(true);
    expect(cells.find((cell) => cell.hour === 10)?.dark).toBe(false);
    expect(cells.find((cell) => cell.hour === 16)?.dark).toBe(true);
  });
});

describe("the pick of it", () => {
  it("finds the highest-scoring hour anywhere in it", () => {
    const forecast = forecastFor(["2026-06-01", "2026-06-02"], (date, at) =>
      date === "2026-06-02" && at === 14 ? {} : { cloudCover: 95 }
    );

    expect(bestHour(scoreOutlook(forecast, EARLY))?.time).toBe("2026-06-02T14:00");
  });

  it("won't offer an hour that has already gone", () => {
    // The best weather of the run was this morning.
    const forecast = forecastFor(["2026-06-01"], (_, at) => (at === 8 ? {} : { cloudCover: 95 }));
    const best = bestHour(scoreOutlook(forecast, new Date("2026-06-01T13:30:00Z")));

    expect(best?.past).toBe(false);
    expect(best?.hour).not.toBe(8);
  });

  it("has nothing to say about an outlook with no hours in it", () => {
    expect(bestHour([])).toBeNull();
  });
});

describe("the colour ramp", () => {
  it("climbs with the score", () => {
    expect(heatBand(10)).toBe(1);
    expect(heatBand(40)).toBe(2);
    expect(heatBand(60)).toBe(3);
    expect(heatBand(80)).toBe(4);
    expect(heatBand(95)).toBe(5);
  });

  it("never disagrees with the tone the bars are drawn in", () => {
    for (let score = 0; score <= 100; score++) {
      const band = heatBand(score);
      const tone = toneFor(score);
      if (tone === "poor") expect(band).toBeLessThanOrEqual(2);
      if (tone === "fair") expect(band).toBe(3);
      if (tone === "good") expect(band).toBeGreaterThanOrEqual(4);
    }
  });
});

describe("the sky over a run of hours", () => {
  it("takes the worst, not the commonest", () => {
    expect(dominantSky([0, 0, 0, 95])).toBe("thunderstorm");
    expect(dominantSky([1, 2, 61])).toBe("rain");
  });

  it("falls back when there is nothing to go on", () => {
    expect(dominantSky([])).toBe("cloudy");
  });
});

describe("where the chosen round falls", () => {
  const round = { date: "2026-06-01", startHour: 13, length: 4 };

  it("covers the hours it is played in", () => {
    expect(chosenWindow(round, "2026-06-01")).toEqual({ firstHour: 13, lastHour: 16 });
  });

  it("has nothing to say about another day", () => {
    expect(chosenWindow(round, "2026-06-02")).toBeNull();
  });

  it("clips a round that runs past the last hour drawn", () => {
    // Teeing off at nine at night, back at one in the morning.
    expect(chosenWindow({ ...round, startHour: 21, length: 4 }, "2026-06-01")).toEqual({
      firstHour: 21,
      lastHour: 22,
    });
  });

  it("clips a round that starts before the first hour drawn", () => {
    expect(chosenWindow({ ...round, startHour: 4, length: 4 }, "2026-06-01")).toEqual({
      firstHour: 6,
      lastHour: 7,
    });
  });

  it("has nothing to say about a round that misses the drawn hours entirely", () => {
    expect(chosenWindow({ ...round, startHour: 1, length: 2 }, "2026-06-01")).toBeNull();
    expect(chosenWindow({ ...round, startHour: 23, length: 2 }, "2026-06-01")).toBeNull();
  });
});
