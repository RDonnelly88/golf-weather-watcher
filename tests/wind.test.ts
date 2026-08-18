import { describe, expect, it } from "vitest";

import { arrowRotation, compassPoint } from "@/lib/wind";
import { describeSky } from "@/lib/weather-codes";

describe("compass points", () => {
  it("names the cardinals", () => {
    expect(compassPoint(0)).toBe("N");
    expect(compassPoint(90)).toBe("E");
    expect(compassPoint(180)).toBe("S");
    expect(compassPoint(270)).toBe("W");
  });

  it("names the points between", () => {
    expect(compassPoint(225)).toBe("SW");
    expect(compassPoint(22.5)).toBe("NNE");
  });

  it("wraps back round to north", () => {
    expect(compassPoint(359)).toBe("N");
    expect(compassPoint(360)).toBe("N");
    expect(compassPoint(-90)).toBe("W");
  });
});

describe("the arrow", () => {
  it("points where the wind is going, not where it came from", () => {
    // A westerly comes from 270° and blows east, so the arrow points east.
    expect(arrowRotation(270)).toBe(90);
    expect(arrowRotation(0)).toBe(180);
  });

  it("stays inside one turn", () => {
    expect(arrowRotation(350)).toBe(170);
  });
});

describe("the sky", () => {
  it("names the codes it knows", () => {
    expect(describeSky(0)).toEqual({ label: "Clear sky", kind: "clear" });
    expect(describeSky(95).kind).toBe("thunderstorm");
  });

  it("treats showers as rain and snow showers as snow", () => {
    expect(describeSky(81).kind).toBe("rain");
    expect(describeSky(86).kind).toBe("snow");
  });

  it("falls back to cloud for a code it has never seen", () => {
    expect(describeSky(999).kind).toBe("cloudy");
  });
});
