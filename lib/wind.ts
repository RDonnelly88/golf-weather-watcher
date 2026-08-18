/**
 * Wind direction, which is reported as the direction the wind blows FROM.
 *
 * That is the convention everywhere in meteorology and the opposite of what an
 * arrow on screen wants to do, which is why both live here rather than being
 * worked out again at each call site. A westerly comes from 270° and pushes
 * your ball east.
 */

const POINTS = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
] as const;

const ARC = 360 / POINTS.length;

/** The compass point the wind comes from. */
export function compassPoint(degrees: number): string {
  const wrapped = ((degrees % 360) + 360) % 360;
  return POINTS[Math.round(wrapped / ARC) % POINTS.length];
}

/**
 * How far to turn an arrow that points north at rest, so it points the way the
 * wind is going.
 */
export function arrowRotation(degrees: number): number {
  return (((degrees + 180) % 360) + 360) % 360;
}
