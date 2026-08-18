/**
 * WMO weather codes, which is what Open-Meteo reports the sky as.
 *
 * `kind` is deliberately coarser than `label`: eight things worth drawing a
 * different picture of, where the label carries the detail. Freezing drizzle
 * and dense drizzle are the same icon and different sentences.
 */
export type SkyKind =
  | "clear"
  | "partly-cloudy"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "thunderstorm";

export interface Sky {
  label: string;
  kind: SkyKind;
}

const CODES: Record<number, Sky> = {
  0: { label: "Clear sky", kind: "clear" },
  1: { label: "Mainly clear", kind: "partly-cloudy" },
  2: { label: "Partly cloudy", kind: "partly-cloudy" },
  3: { label: "Overcast", kind: "cloudy" },
  45: { label: "Fog", kind: "fog" },
  48: { label: "Freezing fog", kind: "fog" },
  51: { label: "Light drizzle", kind: "drizzle" },
  53: { label: "Drizzle", kind: "drizzle" },
  55: { label: "Heavy drizzle", kind: "drizzle" },
  56: { label: "Freezing drizzle", kind: "drizzle" },
  57: { label: "Heavy freezing drizzle", kind: "drizzle" },
  61: { label: "Light rain", kind: "rain" },
  63: { label: "Rain", kind: "rain" },
  65: { label: "Heavy rain", kind: "rain" },
  66: { label: "Freezing rain", kind: "rain" },
  67: { label: "Heavy freezing rain", kind: "rain" },
  71: { label: "Light snow", kind: "snow" },
  73: { label: "Snow", kind: "snow" },
  75: { label: "Heavy snow", kind: "snow" },
  77: { label: "Snow grains", kind: "snow" },
  80: { label: "Light showers", kind: "rain" },
  81: { label: "Showers", kind: "rain" },
  82: { label: "Violent showers", kind: "rain" },
  85: { label: "Snow showers", kind: "snow" },
  86: { label: "Heavy snow showers", kind: "snow" },
  95: { label: "Thunderstorm", kind: "thunderstorm" },
  96: { label: "Thunderstorm with hail", kind: "thunderstorm" },
  99: { label: "Thunderstorm with heavy hail", kind: "thunderstorm" },
};

/**
 * Unknown codes read as overcast rather than as an error. A code we haven't
 * heard of is still a sky, and the hour has a temperature and a wind speed
 * worth showing.
 */
const UNKNOWN: Sky = { label: "Cloudy", kind: "cloudy" };

export function describeSky(code: number): Sky {
  return CODES[code] ?? UNKNOWN;
}
