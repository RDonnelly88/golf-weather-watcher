import { describe, expect, it } from "vitest";

import { pressureNote, uvBand } from "@/lib/comfort";

describe("the UV index", () => {
  it("names the bands", () => {
    expect(uvBand(1).label).toBe("Low");
    expect(uvBand(5).label).toBe("Moderate");
    expect(uvBand(7).label).toBe("High");
    expect(uvBand(10).label).toBe("Very high");
    expect(uvBand(12).label).toBe("Extreme");
  });

  it("gets more alarming as it climbs", () => {
    expect(uvBand(1).tone).toBe("good");
    expect(uvBand(6).tone).toBe("fair");
    expect(uvBand(11).tone).toBe("poor");
  });
});

describe("the pressure", () => {
  it("reads high pressure as settled and low as stormy", () => {
    expect(pressureNote(1030)).toContain("settled");
    expect(pressureNote(1016)).toContain("stable");
    expect(pressureNote(1005)).toContain("changeable");
    expect(pressureNote(980)).toContain("stormy");
  });
});
