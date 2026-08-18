/**
 * The scoring model, pure and tested.
 *
 * One round of golf, one number out of a hundred. Four weather factors are
 * weighted against each other for a base score, and daylight then multiplies
 * it — because a round you cannot see is not a good round in any weather.
 *
 * Every factor reports the whole band table alongside its own score, not just
 * the answer. That is what lets a card show why it said 70 rather than asking
 * the reader to take it on trust, and it means the table exists once rather
 * than once here and again in the component that explains it.
 */

/** The three colours a score is ever drawn in. */
export type Tone = "good" | "fair" | "poor";

export type FactorKey = "temperature" | "wind" | "rain" | "cloud" | "daylight";

interface Band {
  label: string;
  score: number;
  active: boolean;
}

export interface FactorScore {
  key: FactorKey;
  label: string;
  score: number;
  /** The measurement this score came from, formatted for display. */
  reading: string;
  bands: Band[];
  /** An adjustment applied on top of the band, when there was one. */
  note?: string;
}

export interface RoundScore {
  /** The weather score before daylight is applied. */
  base: number;
  overall: number;
  factors: FactorScore[];
  verdict: string;
}

/**
 * Minutes from midnight, because the sun sets at 19:52 rather than in the
 * seven o'clock hour, and a round ending at 19:30 is either inside the light
 * or not. `end` may exceed a day's worth when a round runs past midnight.
 */
export interface DaylightWindow {
  start: number;
  end: number;
  sunrise: number;
  sunset: number;
}

export interface RoundConditions {
  /** Mean over the round, °C. */
  temperature: number;
  /** Mean over the round, mph. */
  windSpeed: number;
  /** The strongest gust in the round, mph. */
  windGust: number;
  /** Mean over the round, %. */
  cloudCover: number;
  /** Total across the round, mm. */
  rainfall: number;
  /** Mean over the round, %. */
  rainChance: number;
  /** Absent when the forecast carried no sunrise and sunset. */
  daylight?: DaylightWindow;
}

/**
 * What each factor is worth.
 *
 * Rain leads because it is the one that sends people home. Temperature and
 * wind matter about equally — Scotland supplies plenty of both — and cloud is
 * a matter of enjoyment rather than playability, so it carries least.
 */
export const WEIGHTS = {
  rain: 0.35,
  temperature: 0.25,
  wind: 0.25,
  cloud: 0.15,
} as const;

/** Above this a score reads as good, below the second as poor. */
const TONE_THRESHOLDS = { good: 75, fair: 50 } as const;

export function toneFor(score: number): Tone {
  if (score >= TONE_THRESHOLDS.good) return "good";
  if (score >= TONE_THRESHOLDS.fair) return "fair";
  return "poor";
}

/**
 * A band table is read in order and the first `upTo` the value falls under
 * wins, so the boundaries can't overlap or leave a gap the way a list of
 * min/max pairs can.
 */
interface BandRow {
  upTo: number;
  score: number;
  label: string;
}

const TEMPERATURE_BANDS: BandRow[] = [
  { upTo: 5, score: 20, label: "Under 5°C" },
  { upTo: 10, score: 40, label: "5–10°C" },
  { upTo: 15, score: 70, label: "10–15°C" },
  { upTo: 20, score: 100, label: "15–20°C" },
  { upTo: 25, score: 90, label: "20–25°C" },
  { upTo: Infinity, score: 60, label: "Over 25°C" },
];

const WIND_BANDS: BandRow[] = [
  { upTo: 2, score: 100, label: "Under 2 mph" },
  { upTo: 5, score: 95, label: "2–5 mph" },
  { upTo: 8, score: 85, label: "5–8 mph" },
  { upTo: 12, score: 70, label: "8–12 mph" },
  { upTo: 15, score: 50, label: "12–15 mph" },
  { upTo: 20, score: 30, label: "15–20 mph" },
  { upTo: Infinity, score: 10, label: "Over 20 mph" },
];

const RAINFALL_BANDS: BandRow[] = [
  { upTo: 0.5, score: 85, label: "Under 0.5 mm" },
  { upTo: 1, score: 70, label: "0.5–1 mm" },
  { upTo: 2, score: 50, label: "1–2 mm" },
  { upTo: 5, score: 25, label: "2–5 mm" },
  { upTo: Infinity, score: 5, label: "Over 5 mm" },
];

/** Used only when the round is forecast to stay dry, where the risk is all there is. */
const RAIN_CHANCE_BANDS: BandRow[] = [
  { upTo: 10, score: 100, label: "Under 10% chance" },
  { upTo: 20, score: 95, label: "10–20% chance" },
  { upTo: 30, score: 90, label: "20–30% chance" },
  { upTo: 40, score: 85, label: "30–40% chance" },
  { upTo: Infinity, score: 80, label: "Over 40% chance" },
];

const CLOUD_BANDS: BandRow[] = [
  { upTo: 20, score: 100, label: "Under 20%" },
  { upTo: 40, score: 85, label: "20–40%" },
  { upTo: 60, score: 70, label: "40–60%" },
  { upTo: 80, score: 50, label: "60–80%" },
  { upTo: Infinity, score: 30, label: "Over 80%" },
];

/** Gusts are only worth a penalty when they are both strong and unlike the wind. */
const GUST = { minSpeed: 10, aboveWind: 10, penalty: 0.8 } as const;

function bandFor(value: number, rows: BandRow[]): BandRow {
  return rows.find((row) => value < row.upTo) ?? rows[rows.length - 1];
}

function toBands(rows: BandRow[], active: BandRow): Band[] {
  return rows.map((row) => ({
    label: row.label,
    score: row.score,
    active: row === active,
  }));
}

export function scoreTemperature(temperature: number): FactorScore {
  const band = bandFor(temperature, TEMPERATURE_BANDS);
  return {
    key: "temperature",
    label: "Temperature",
    score: band.score,
    reading: `${temperature.toFixed(1)}°C`,
    bands: toBands(TEMPERATURE_BANDS, band),
  };
}

export function scoreWind(windSpeed: number, windGust: number): FactorScore {
  const band = bandFor(windSpeed, WIND_BANDS);
  const gusty =
    windGust > GUST.minSpeed && windGust > windSpeed + GUST.aboveWind;
  const score = gusty ? Math.round(band.score * GUST.penalty) : band.score;

  return {
    key: "wind",
    label: "Wind",
    score,
    reading: `${windSpeed.toFixed(1)} mph`,
    bands: toBands(WIND_BANDS, band),
    note: gusty
      ? `Gusting to ${Math.round(windGust)} mph, so the band is cut to ${Math.round(GUST.penalty * 100)}%`
      : undefined,
  };
}

/**
 * Rain is scored on what falls, or on the risk of it when nothing does.
 *
 * A dry round with a forty per cent chance is not the same as a dry round
 * under a clear sky — you carry the waterproofs either way — so the two cases
 * read different tables. When it does rain, the chance still shades the score:
 * a certainty of half a millimetre is worse than an outside possibility of it.
 */
export function scoreRain(rainfall: number, rainChance: number): FactorScore {
  if (rainfall === 0) {
    const band = bandFor(rainChance, RAIN_CHANCE_BANDS);
    return {
      key: "rain",
      label: "Rain",
      score: band.score,
      reading: `Dry, ${Math.round(rainChance)}% chance`,
      bands: toBands(RAIN_CHANCE_BANDS, band),
    };
  }

  const band = bandFor(rainfall, RAINFALL_BANDS);
  // Lighter rain is shaded harder, because at half a millimetre the chance of
  // it is most of what you are deciding on.
  const divisor = rainfall < 0.5 ? 10 : rainfall < 1 ? 15 : 20;
  const adjustment = rainChance > 0 ? rainChance / divisor : 0;

  return {
    key: "rain",
    label: "Rain",
    score: Math.round(band.score - adjustment),
    reading: `${rainfall.toFixed(1)} mm, ${Math.round(rainChance)}% chance`,
    bands: toBands(RAINFALL_BANDS, band),
    note:
      adjustment > 0
        ? `Less ${Math.round(adjustment)} for a ${Math.round(rainChance)}% chance of it`
        : undefined,
  };
}

export function scoreCloud(cloudCover: number): FactorScore {
  const band = bandFor(cloudCover, CLOUD_BANDS);
  return {
    key: "cloud",
    label: "Cloud",
    score: band.score,
    reading: `${Math.round(cloudCover)}% cover`,
    bands: toBands(CLOUD_BANDS, band),
  };
}

/**
 * How much of the round is played in daylight.
 *
 * Ordered rules rather than a band table: the answer depends on two edges at
 * once, and the first rule that matches wins. Read top to bottom, they go from
 * the round that never sees the sun, through the two comfortable cases, to the
 * degrees of being caught out at one end or the other.
 */
const DAYLIGHT_RULES: {
  label: string;
  score: number;
  test: (w: DaylightWindow) => boolean;
}[] = [
  {
    label: "In the dark",
    score: 0,
    test: (w) => w.end <= w.sunrise || w.start >= w.sunset,
  },
  {
    label: "Full daylight",
    score: 100,
    // An hour's grace at each end: the light at sunrise is not light to play in.
    test: (w) => w.start >= w.sunrise + 120 && w.end <= w.sunset - 60,
  },
  {
    label: "Shoulder hours",
    score: 85,
    test: (w) => w.start >= w.sunrise && w.end <= w.sunset,
  },
  {
    label: "Well before sunrise",
    score: 10,
    test: (w) => w.sunrise - w.start >= 120,
  },
  {
    label: "Well after sunset",
    score: 20,
    test: (w) => w.end - w.sunset >= 120,
  },
  { label: "Early start", score: 50, test: (w) => w.start < w.sunrise },
  { label: "Late finish", score: 60, test: (w) => w.end > w.sunset },
];

/** When the forecast carries no sunrise, daylight can't count for or against. */
const DAYLIGHT_UNKNOWN = 85;

function clock(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function scoreDaylight(window?: DaylightWindow): FactorScore {
  if (!window) {
    return {
      key: "daylight",
      label: "Daylight",
      score: DAYLIGHT_UNKNOWN,
      reading: "Sunrise and sunset unknown",
      bands: DAYLIGHT_RULES.map((rule) => ({
        label: rule.label,
        score: rule.score,
        active: false,
      })),
    };
  }

  const rule = DAYLIGHT_RULES.find((candidate) => candidate.test(window));
  return {
    key: "daylight",
    label: "Daylight",
    score: rule?.score ?? DAYLIGHT_UNKNOWN,
    reading: `Light from ${clock(window.sunrise)} to ${clock(window.sunset)}`,
    bands: DAYLIGHT_RULES.map((candidate) => ({
      label: candidate.label,
      score: candidate.score,
      active: candidate === rule,
    })),
  };
}

/**
 * The verdicts, worst first, each one the floor for the score above the next.
 * Read as a list they are the whole opinion the app has.
 */
const VERDICTS: { from: number; text: string }[] = [
  { from: 90, text: "Perfect conditions. We're going to have a ball." },
  { from: 75, text: "For the time of year, we'll take it." },
  { from: 60, text: "Decent — we've done worse." },
  { from: 45, text: "Yuk, but we'll survive." },
  { from: 30, text: "This will be grim. Are we sure it's a good idea?" },
  { from: 0, text: "Can we get our money back and go on the piss instead?" },
];

const DARK_VERDICT = "Playing in the dark? Might as well go to the pub.";
const GLOOM_VERDICT = "You'll be finishing in the dark. This will be grim.";
/** Below this the light is the story, whatever the weather is doing. */
const GLOOM_DAYLIGHT = 20;

export function verdictFor(overall: number, daylight: number): string {
  if (daylight === 0) return DARK_VERDICT;
  if (daylight <= GLOOM_DAYLIGHT) return GLOOM_VERDICT;
  return (
    VERDICTS.find((verdict) => overall >= verdict.from)?.text ??
    VERDICTS[VERDICTS.length - 1].text
  );
}

/** The whole round, scored. */
export function scoreRound(conditions: RoundConditions): RoundScore {
  const temperature = scoreTemperature(conditions.temperature);
  const wind = scoreWind(conditions.windSpeed, conditions.windGust);
  const rain = scoreRain(conditions.rainfall, conditions.rainChance);
  const cloud = scoreCloud(conditions.cloudCover);
  const daylight = scoreDaylight(conditions.daylight);

  const base =
    temperature.score * WEIGHTS.temperature +
    wind.score * WEIGHTS.wind +
    rain.score * WEIGHTS.rain +
    cloud.score * WEIGHTS.cloud;

  const overall = Math.round(base * (daylight.score / 100));

  return {
    base: Math.round(base),
    overall,
    factors: [rain, temperature, wind, cloud, daylight],
    verdict: verdictFor(overall, daylight.score),
  };
}
