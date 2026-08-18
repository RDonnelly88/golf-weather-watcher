import { describe, expect, it } from "vitest";

import {
  WEIGHTS,
  scoreCloud,
  scoreDaylight,
  scoreRain,
  scoreRound,
  scoreTemperature,
  scoreWind,
  toneFor,
  verdictFor,
  type RoundConditions,
} from "@/lib/scoring";

/** A pleasant afternoon, which each test then spoils in one way. */
function conditions(overrides: Partial<RoundConditions> = {}): RoundConditions {
  return {
    temperature: 17,
    windSpeed: 6,
    windGust: 8,
    cloudCover: 15,
    rainfall: 0,
    rainChance: 5,
    daylight: { start: 13 * 60, end: 17 * 60, sunrise: 6 * 60, sunset: 20 * 60 },
    ...overrides,
  };
}

describe("temperature", () => {
  it("scores the ideal range top", () => {
    expect(scoreTemperature(17).score).toBe(100);
  });

  it("marks the band the reading fell into, and only that one", () => {
    const active = scoreTemperature(17).bands.filter((band) => band.active);
    expect(active).toHaveLength(1);
    expect(active[0].label).toBe("15–20°C");
  });

  it("puts a boundary in the band above it", () => {
    expect(scoreTemperature(15).score).toBe(100);
    expect(scoreTemperature(14.9).score).toBe(70);
  });

  it("scores a heatwave below a mild day", () => {
    expect(scoreTemperature(30).score).toBeLessThan(scoreTemperature(17).score);
  });
});

describe("wind", () => {
  it("scores a still day top", () => {
    expect(scoreWind(1, 1).score).toBe(100);
  });

  it("cuts the band when gusts run well above the wind", () => {
    expect(scoreWind(6, 20).score).toBe(Math.round(85 * 0.8));
    expect(scoreWind(6, 20).note).toContain("20 mph");
  });

  it("leaves a steady wind alone, however hard it blows", () => {
    // 25 mph gusting to 30 is not gusty, it is just windy.
    expect(scoreWind(25, 30).score).toBe(10);
    expect(scoreWind(25, 30).note).toBeUndefined();
  });

  it("ignores a gust that is strong but close to the wind", () => {
    expect(scoreWind(6, 15).note).toBeUndefined();
  });
});

describe("rain", () => {
  it("reads the chance when the round stays dry", () => {
    expect(scoreRain(0, 5).score).toBe(100);
    expect(scoreRain(0, 60).score).toBe(80);
  });

  it("scores a dry round with a high chance below a dry round without one", () => {
    expect(scoreRain(0, 60).score).toBeLessThan(scoreRain(0, 5).score);
  });

  it("reads the amount once rain is forecast", () => {
    expect(scoreRain(3, 0).score).toBe(25);
  });

  it("shades the amount by how likely it is", () => {
    const certain = scoreRain(0.3, 90);
    const outside = scoreRain(0.3, 10);
    expect(certain.score).toBeLessThan(outside.score);
    expect(certain.note).toContain("90%");
  });

  it("keeps a downpour worse than a shower", () => {
    expect(scoreRain(8, 100).score).toBeLessThan(scoreRain(0.4, 100).score);
  });
});

describe("cloud", () => {
  it("scores a clear sky top and an overcast one bottom", () => {
    expect(scoreCloud(10).score).toBe(100);
    expect(scoreCloud(95).score).toBe(30);
  });
});

describe("daylight", () => {
  const day = { sunrise: 6 * 60, sunset: 20 * 60 };

  it("scores the middle of the day top", () => {
    expect(scoreDaylight({ ...day, start: 13 * 60, end: 17 * 60 }).score).toBe(100);
  });

  it("counts the minutes, not the hour", () => {
    // Sunset at 19:52 and a round ending at 19:30 finishes in the light.
    // Truncating the sunset to "the seven o'clock hour" made it a late finish.
    const dusk = { sunrise: 6 * 60, sunset: 19 * 60 + 52 };
    expect(scoreDaylight({ ...dusk, start: 15 * 60, end: 19 * 60 + 30 }).score).toBe(85);
  });

  it("wants an hour in hand before sunset to call it a full day", () => {
    expect(scoreDaylight({ ...day, start: 14 * 60, end: 19 * 60 }).score).toBe(100);
    expect(scoreDaylight({ ...day, start: 14 * 60, end: 19 * 60 + 1 }).score).toBe(85);
  });

  it("penalises a finish after sunset", () => {
    const late = scoreDaylight({ ...day, start: 17 * 60, end: 21 * 60 });
    expect(late.score).toBe(60);
  });

  it("penalises a long finish after sunset harder", () => {
    const verylate = scoreDaylight({ ...day, start: 18 * 60, end: 22 * 60 });
    expect(verylate.score).toBe(20);
  });

  it("scores a round entirely after sunset at nothing", () => {
    expect(scoreDaylight({ ...day, start: 21 * 60, end: 23 * 60 }).score).toBe(0);
  });

  it("handles a round that runs past midnight", () => {
    // The window arrives in minutes past the tee-off day's midnight, so a
    // round finishing at 01:00 is 1500, not 60.
    expect(scoreDaylight({ ...day, start: 22 * 60, end: 25 * 60 }).score).toBe(0);
  });

  it("neither rewards nor punishes when the sun times are missing", () => {
    const unknown = scoreDaylight(undefined);
    expect(unknown.score).toBe(85);
    expect(unknown.bands.every((band) => !band.active)).toBe(true);
  });
});

describe("the round", () => {
  it("weights the four weather factors and multiplies by the light", () => {
    const round = scoreRound(conditions());
    const byKey = Object.fromEntries(round.factors.map((f) => [f.key, f.score]));

    const base =
      byKey.temperature * WEIGHTS.temperature +
      byKey.wind * WEIGHTS.wind +
      byKey.rain * WEIGHTS.rain +
      byKey.cloud * WEIGHTS.cloud;

    expect(round.base).toBe(Math.round(base));
    expect(round.overall).toBe(Math.round(base * (byKey.daylight / 100)));
  });

  it("reports every factor exactly once", () => {
    const keys = scoreRound(conditions()).factors.map((factor) => factor.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain("daylight");
  });

  it("scores a perfect afternoon high and a foul one low", () => {
    expect(scoreRound(conditions()).overall).toBeGreaterThan(90);
    expect(
      scoreRound(
        conditions({ temperature: 3, windSpeed: 25, windGust: 40, rainfall: 9, rainChance: 100, cloudCover: 100 })
      ).overall
    ).toBeLessThan(30);
  });

  it("wipes out the weather when the round is played in the dark", () => {
    const dark = scoreRound(
      conditions({
        daylight: { start: 22 * 60, end: 26 * 60, sunrise: 6 * 60, sunset: 20 * 60 },
      })
    );
    expect(dark.overall).toBe(0);
    expect(dark.verdict).toContain("dark");
  });
});

describe("verdicts and tone", () => {
  it("gives every score a verdict", () => {
    for (let score = 0; score <= 100; score++) {
      expect(verdictFor(score, 100)).toBeTruthy();
    }
  });

  it("lets the light overrule the weather when there is none", () => {
    expect(verdictFor(95, 0)).toBe(verdictFor(10, 0));
  });

  it("colours a score by how good it is", () => {
    expect(toneFor(80)).toBe("good");
    expect(toneFor(60)).toBe("fair");
    expect(toneFor(20)).toBe("poor");
  });
});
