import { describe, expect, it } from "vitest";

import {
  courseHandicap,
  formatHandicap,
  formatToPar,
  expectedNineDifferential,
  scoreBand,
  scoreDifferential,
  scoreFor,
  type TeeSet,
} from "@/lib/handicap";

/** A par 72 rated above its par, with nine-hole ratings on the card too. */
const WHITES: TeeSet = {
  id: "whites",
  name: "White",
  par: 72,
  courseRating: 72.6,
  slopeRating: 125,
  nine: { par: 36, courseRating: 36.1, slopeRating: 122 },
};

/** No nine-hole ratings, which plenty of cards don't carry. */
const YELLOWS: TeeSet = {
  id: "yellows",
  name: "Yellow",
  par: 70,
  courseRating: 69.2,
  slopeRating: 118,
};

describe("course handicap", () => {
  it("takes the slope and the gap between rating and par", () => {
    // 12 × (125 / 113) + (72.6 − 72) = 13.27 + 0.6 = 13.87
    expect(courseHandicap(12, WHITES, 18)).toBe(14);
  });

  it("gives strokes away on a course rated under its par", () => {
    // 12 × (118 / 113) + (69.2 − 70) = 12.53 − 0.8 = 11.73
    expect(courseHandicap(12, YELLOWS, 18)).toBe(12);
  });

  it("halves the index over nine holes", () => {
    // 6 × (122 / 113) + (36.1 − 36) = 6.48 + 0.1 = 6.58
    expect(courseHandicap(12, WHITES, 9)).toBe(7);
  });

  it("has nothing to say for nine when the card carries no nine-hole rating", () => {
    expect(courseHandicap(12, YELLOWS, 9)).toBeNull();
  });

  it("handles a plus handicap, where the strokes go the other way", () => {
    // −2.4 × (125 / 113) + 0.6 = −2.65 + 0.6 = −2.05
    expect(courseHandicap(-2.4, WHITES, 18)).toBe(-2);
  });

  it("gives a scratch player the difference between rating and par", () => {
    expect(courseHandicap(0, WHITES, 18)).toBe(1);
  });
});

describe("the nine you didn't play", () => {
  /*
   * The governing bodies don't publish the expected differential, but they do
   * publish one worked example: a nine-hole differential of 7.2 becoming an
   * eighteen-hole differential of 15.7, which puts the expected value at 8.5.
   * This formula gives 8.5 for an index of 14.1 — the sort of player such an
   * example uses, and the one check on it there is.
   */
  it("matches the published worked example", () => {
    expect(Math.round(expectedNineDifferential(14.1) * 10) / 10).toBe(8.5);
    const combined = 7.2 + expectedNineDifferential(14.1);
    expect(Math.round(combined * 10) / 10).toBe(15.7);
  });

  it("rises with the index", () => {
    expect(expectedNineDifferential(0)).toBeLessThan(expectedNineDifferential(12));
    expect(expectedNineDifferential(12)).toBeLessThan(expectedNineDifferential(28));
  });

  it("expects a scratch player to be a shade over the card", () => {
    // Two of these is what an eighteen is expected to return, and a scratch
    // player averages a couple over rather than level: the index is the best
    // eight of twenty, not the average of them.
    expect(expectedNineDifferential(0) * 2).toBeCloseTo(2.3, 1);
  });
});

describe("score differential", () => {
  it("takes the course out of the score", () => {
    // (85 − 72.6) × 113 / 125 = 11.2
    expect(scoreDifferential(85, WHITES, 18, 12)).toBe(11.2);
  });

  it("returns less than the score suggests on a hard course", () => {
    const hard: TeeSet = { ...WHITES, slopeRating: 140 };
    expect(scoreDifferential(85, hard, 18, 12)).toBeLessThan(
      scoreDifferential(85, WHITES, 18, 12)!
    );
  });

  it("makes a nine up to eighteen with the expected differential", () => {
    // (43 − 36.1) × 113 / 122 = 6.39, plus 7.41 expected for an index of 12.
    expect(scoreDifferential(43, WHITES, 9, 12)).toBe(13.8);
  });

  it("has nothing to say for nine when the card carries no nine-hole rating", () => {
    expect(scoreDifferential(43, YELLOWS, 9, 12)).toBeNull();
  });

  it("carries one decimal place and no more", () => {
    const value = scoreDifferential(83, WHITES, 18, 12)!;
    expect(value * 10).toBe(Math.round(value * 10));
  });
});

describe("the score a differential needs", () => {
  it("inverts the differential", () => {
    const score = scoreFor(11.2, WHITES, 18, 12)!;
    expect(scoreDifferential(score, WHITES, 18, 12)).toBeCloseTo(11.2, 1);
  });

  it("inverts it over nine as well, expected differential and all", () => {
    const score = scoreFor(13.8, WHITES, 9, 12)!;
    expect(scoreDifferential(score, WHITES, 9, 12)).toBeCloseTo(13.8, 1);
  });

  it("asks for fewer shots for a better differential", () => {
    expect(scoreFor(8, WHITES, 18, 12)!).toBeLessThan(
      scoreFor(14, WHITES, 18, 12)!
    );
  });
});

describe("the band", () => {
  const band = scoreBand(12, WHITES, 18, 4);

  it("runs either side of playing to your handicap", () => {
    expect(band).toHaveLength(9);
    expect(band.map((row) => row.score)).toEqual([82, 83, 84, 85, 86, 87, 88, 89, 90]);
  });

  it("marks the round that means you played to your handicap", () => {
    const expected = band.filter((row) => row.expected);
    expect(expected).toHaveLength(1);
    // Par 72 plus a course handicap of 14.
    expect(expected[0].score).toBe(86);
  });

  it("counts each row against par", () => {
    expect(band.find((row) => row.score === 72 + 14)?.toPar).toBe(14);
  });

  it("says how each score compares with the index", () => {
    const level = band.find((row) => row.expected)!;
    // Playing to your course handicap returns a differential near your index,
    // a shade above it because the rating sits above par.
    expect(Math.abs(level.against)).toBeLessThan(1.5);

    const better = band[0];
    expect(better.against).toBeLessThan(level.against);
  });

  it("improves down the band", () => {
    const differentials = band.map((row) => row.differential);
    expect([...differentials].sort((a, b) => a - b)).toEqual(differentials);
  });

  it("has nothing to show for nine holes the card doesn't rate", () => {
    expect(scoreBand(12, YELLOWS, 9, 4)).toEqual([]);
  });
});

describe("writing a handicap down", () => {
  it("writes a plus handicap with the sign the other way round", () => {
    expect(formatHandicap(-2.4)).toBe("+2.4");
    expect(formatHandicap(12.3)).toBe("12.3");
    expect(formatHandicap(0)).toBe("0.0");
  });

  it("writes whole strokes when asked for no decimals", () => {
    expect(formatHandicap(-2, 0)).toBe("+2");
    expect(formatHandicap(14, 0)).toBe("14");
  });

  it("writes a score against par the way a card does", () => {
    expect(formatToPar(0)).toBe("level");
    expect(formatToPar(4)).toBe("+4");
    expect(formatToPar(-1)).toBe("-1");
  });
});
