import { describe, expect, it } from "vitest";

import {
  finishTime,
  lastDay,
  minutesOfDay,
  roundHours,
  summariseRound,
  type HourlyReading,
  type RoundForecast,
} from "@/lib/forecast";
import { sourceFor } from "@/lib/open-meteo";

function hour(time: string, overrides: Partial<HourlyReading> = {}): HourlyReading {
  return {
    time,
    temperature: 15,
    feelsLike: 14,
    humidity: 70,
    dewPoint: 10,
    pressure: 1013,
    windSpeed: 8,
    windGust: 12,
    windDirection: 250,
    cloudCover: 40,
    rainfall: 0,
    rainChance: 10,
    uvIndex: 3,
    visibility: 20,
    code: 2,
    ...overrides,
  };
}

describe("the round's hours", () => {
  it("runs from the tee time for as long as the round lasts", () => {
    expect(roundHours({ date: "2026-09-26", startHour: 13, length: 4 })).toEqual([
      "2026-09-26T13:00",
      "2026-09-26T14:00",
      "2026-09-26T15:00",
      "2026-09-26T16:00",
    ]);
  });

  it("carries on into the next day when the round runs past midnight", () => {
    const hours = roundHours({ date: "2026-09-26", startHour: 22, length: 4 });
    expect(hours).toEqual([
      "2026-09-26T22:00",
      "2026-09-26T23:00",
      "2026-09-27T00:00",
      "2026-09-27T01:00",
    ]);
    expect(hours).toHaveLength(4);
  });

  it("asks the API for every day the round touches", () => {
    expect(lastDay({ date: "2026-09-26", startHour: 13, length: 4 })).toBe("2026-09-26");
    expect(lastDay({ date: "2026-09-26", startHour: 22, length: 4 })).toBe("2026-09-27");
  });

  it("crosses a month end", () => {
    expect(lastDay({ date: "2026-09-30", startHour: 23, length: 3 })).toBe("2026-10-01");
  });
});

describe("reading a clock time", () => {
  it("counts minutes from midnight", () => {
    expect(minutesOfDay("2026-09-26T00:00")).toBe(0);
    expect(minutesOfDay("2026-09-26T19:52")).toBe(19 * 60 + 52);
  });
});

describe("choosing a model", () => {
  const today = new Date("2026-09-26T12:00:00Z");

  it("forecasts the future", () => {
    expect(sourceFor("2026-10-01", today)).toBe("forecast");
  });

  it("forecasts the last few days, which the archive has not caught up with", () => {
    expect(sourceFor("2026-09-24", today)).toBe("forecast");
  });

  it("reaches for the archive further back", () => {
    expect(sourceFor("2019-07-14", today)).toBe("archive");
  });
});

describe("summarising a round", () => {
  const forecast: RoundForecast = {
    source: "forecast",
    sunrise: "2026-09-26T07:02",
    sunset: "2026-09-26T19:14",
    hours: [
      hour("2026-09-26T13:00", { temperature: 14, windSpeed: 6, windGust: 10, rainfall: 0.2, rainChance: 20, cloudCover: 20 }),
      hour("2026-09-26T14:00", { temperature: 16, windSpeed: 10, windGust: 22, rainfall: 0.4, rainChance: 40, cloudCover: 60 }),
    ],
  };

  const summary = summariseRound(forecast, { startHour: 13, length: 2 });

  it("averages what you feel throughout", () => {
    expect(summary.temperature).toBe(15);
    expect(summary.windSpeed).toBe(8);
    expect(summary.cloudCover).toBe(40);
    expect(summary.rainChance).toBe(30);
  });

  it("totals the rain, because it accumulates", () => {
    expect(summary.rainfall).toBeCloseTo(0.6);
  });

  it("takes the worst gust of the round, not the average of them", () => {
    expect(summary.windGust).toBe(22);
  });

  it("reads the daylight window off the sun times", () => {
    expect(summary.daylight).toEqual({
      start: 13 * 60,
      end: 15 * 60,
      sunrise: 7 * 60 + 2,
      sunset: 19 * 60 + 14,
    });
  });

  it("falls back to the wind when an hour carries no gust", () => {
    const gustless = summariseRound(
      { ...forecast, hours: [hour("2026-09-26T13:00", { windSpeed: 9, windGust: null })] },
      { startHour: 13, length: 1 }
    );
    expect(gustless.windGust).toBe(9);
  });

  it("leaves daylight unknown when the day carried no sun times", () => {
    const sunless = summariseRound(
      { ...forecast, sunrise: null, sunset: null },
      { startHour: 13, length: 2 }
    );
    expect(sunless.daylight).toBeUndefined();
  });
});

describe("when the round ends", () => {
  it("adds the length to the tee time", () => {
    expect(finishTime("13:00", 4)).toEqual({ clock: "17:00", nextDay: false });
    expect(finishTime("09:30", 3)).toEqual({ clock: "12:30", nextDay: false });
  });

  it("says so when it finishes the next day", () => {
    expect(finishTime("22:00", 4)).toEqual({ clock: "02:00", nextDay: true });
  });

  it("treats midnight itself as the next day", () => {
    expect(finishTime("20:00", 4)).toEqual({ clock: "00:00", nextDay: true });
  });
});
