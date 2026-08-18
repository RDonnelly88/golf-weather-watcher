import type { Tone } from "@/lib/scoring";

/**
 * The readings that don't feed the score but change what you pack.
 *
 * None of these move the number — a round is scored on temperature, wind,
 * rain, cloud and light. They are here because "3" means nothing and
 * "moderate, wear a hat" means something, and because the sentence should be
 * written once rather than at each of the places that shows the figure.
 */

export interface Reading {
  label: string;
  tone: Tone;
}

const UV_BANDS: { upTo: number; label: string; tone: Tone }[] = [
  { upTo: 3, label: "Low", tone: "good" },
  { upTo: 6, label: "Moderate", tone: "fair" },
  { upTo: 8, label: "High", tone: "fair" },
  { upTo: 11, label: "Very high", tone: "poor" },
  { upTo: Infinity, label: "Extreme", tone: "poor" },
];

export function uvBand(uvIndex: number): Reading {
  const band = UV_BANDS.find((candidate) => uvIndex < candidate.upTo) ?? UV_BANDS[0];
  return { label: band.label, tone: band.tone };
}

/** Above this, the sun is worth doing something about. */
export const UV_SUNSCREEN = 5;

const PRESSURE_BANDS: { above: number; label: string }[] = [
  { above: 1020, label: "High — settled" },
  { above: 1013, label: "Normal — stable" },
  { above: 1000, label: "Low — changeable" },
  { above: -Infinity, label: "Very low — stormy" },
];

export function pressureNote(hPa: number): string {
  return (
    PRESSURE_BANDS.find((band) => hPa > band.above)?.label ??
    PRESSURE_BANDS[PRESSURE_BANDS.length - 1].label
  );
}

/** Below this, you lose sight of the ball before it lands. */
export const POOR_VISIBILITY_KM = 5;

/** How far the wind has to drag the temperature down before it is worth saying. */
export const CHILL_DEGREES = 2;

/** Above this the air stops drying you and starts sticking to you. */
export const MUGGY_DEW_POINT = 18;
