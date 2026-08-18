/**
 * Every tunable value lives here. Nothing in the app should inline a default,
 * a limit or a page size — import it, so there is one place to change it.
 *
 * The scoring thresholds are NOT here. They are the model rather than a
 * setting, and they live in `lib/scoring.ts` with the maths that reads them.
 */

export interface Course {
  name: string;
  latitude: number;
  longitude: number;
}

/** Where the app opens if nothing has been chosen before. */
export const DEFAULT_COURSE: Course = {
  name: "St Andrews, Scotland",
  latitude: 56.3398,
  longitude: -2.7967,
};

/**
 * The shortlist offered before anything is typed, and before anybody has
 * saved a course of their own.
 *
 * Search reaches every course in the world; this is only a way past the
 * keyboard for the handful that come up most. It is deliberately a constant
 * rather than a seed for the saved list — seeding would freeze this list at
 * whatever it said the first time somebody opened the app.
 */
export const POPULAR_COURSES: Course[] = [
  DEFAULT_COURSE,
  { name: "Carnoustie, Scotland", latitude: 56.4986, longitude: -2.7108 },
  { name: "Royal Troon, Scotland", latitude: 55.5343, longitude: -4.6494 },
  { name: "Mearns Castle, Scotland", latitude: 55.786, longitude: -4.309 },
  { name: "Pebble Beach, California", latitude: 36.5686, longitude: -121.949 },
  { name: "Augusta National, Georgia", latitude: 33.5031, longitude: -82.0197 },
];

/**
 * One course, identified.
 *
 * Two courses can share a name — there are four Royal Golf Clubs — so the
 * coordinates are part of who a course is. Rounded, because a place searched
 * for twice comes back with the same position to about a metre and not always
 * to the last decimal.
 */
export function courseKey(course: Course): string {
  return `${course.name}@${course.latitude.toFixed(4)},${course.longitude.toFixed(4)}`;
}

export const ROUND = {
  /** Hours a round can be set to. Four is a full eighteen at a decent pace. */
  lengths: [2, 3, 4, 5, 6] as const,
  defaultLength: 4,
  defaultTeeTime: "13:00",
} as const;

export const FORECAST = {
  /** How far ahead Open-Meteo's forecast model runs. */
  maxDaysAhead: 15,
  /**
   * Earlier than this many days back, the forecast endpoint no longer carries
   * the day and the archive takes over. The archive is reanalysis — what the
   * weather actually did, rather than what was expected of it.
   */
  archiveOlderThanDays: 5,
  /** The archive's own reach. */
  archiveFrom: "1940-01-01",
} as const;

export const SEARCH = {
  /** Nominatim asks for no more than one call a second; a pause beats a queue. */
  debounceMs: 500,
  minQueryLength: 2,
  maxResults: 8,
} as const;

/**
 * How long a forecast stays fresh.
 *
 * Open-Meteo updates hourly, so anything shorter is asking the same question
 * twice. React Query holds the answer for the same period, which is what makes
 * flipping between two tee times free.
 */
export const CACHE_SECONDS = 60 * 15;
