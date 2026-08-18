import { z } from "zod";

import { SEARCH } from "@/lib/config";

/**
 * Somewhere you can tee off, found by name.
 *
 * Nominatim is OpenStreetMap's geocoder. Its terms ask for one request a
 * second and a user agent that says who is calling, neither of which a browser
 * can honour — a browser sends its own user agent and fires whatever the page
 * asks it to — so this runs on the server behind `/api/places`.
 */

export interface Place {
  id: string;
  /** What to call it: "Carnoustie Golf Links". */
  name: string;
  /** Where it is: "Angus, Scotland". Shown under the name, greyed. */
  detail: string;
  latitude: number;
  longitude: number;
  kind: "golf" | "town" | "place";
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

/**
 * Nominatim asks callers to identify themselves, and blocks the ones that
 * don't. A contact address is part of what it asks for; the repository stands
 * in for one.
 */
const USER_AGENT =
  "golf-weather-watcher (https://github.com/RDonnelly88/golf-weather-watcher)";

const ResultSchema = z.object({
  place_id: z.number(),
  display_name: z.string(),
  lat: z.string(),
  lon: z.string(),
  class: z.string().optional(),
  type: z.string().optional(),
});

const ResultsSchema = z.array(ResultSchema);

type Result = z.infer<typeof ResultSchema>;

const GOLF = /\b(golf|links|country club)\b/i;

function classify(result: Result): Place["kind"] {
  if (result.class === "leisure" && result.type === "golf_course") return "golf";
  if (GOLF.test(result.display_name)) return "golf";
  if (result.class === "place") return "town";
  return "place";
}

/**
 * A display name is a full postal address from the building out to the
 * country. The first part is the thing itself; the two after it are enough to
 * tell two courses of the same name apart without printing a postcode.
 */
function toPlace(result: Result): Place {
  const [name, ...rest] = result.display_name.split(",").map((part) => part.trim());

  return {
    id: String(result.place_id),
    name,
    detail: rest.slice(0, 2).join(", "),
    latitude: Number(result.lat),
    longitude: Number(result.lon),
    kind: classify(result),
  };
}

async function query(
  search: string,
  limit: number,
  signal?: AbortSignal
): Promise<Result[]> {
  const params = new URLSearchParams({
    q: search,
    format: "json",
    limit: String(limit),
  });

  const response = await fetch(`${NOMINATIM_URL}?${params}`, {
    signal,
    headers: { "user-agent": USER_AGENT, accept: "application/json" },
  });

  if (!response.ok) return [];

  const parsed = ResultsSchema.safeParse(await response.json());
  return parsed.success ? parsed.data : [];
}

/**
 * Places matching what was typed, courses first.
 *
 * Searching the words as typed finds towns and landmarks; searching them again
 * with "golf course" appended is what finds the course itself, which
 * Nominatim otherwise ranks below every street of the same name. The second
 * search is skipped when the words already say golf, and the two run in turn
 * rather than together to stay inside one request a second.
 */
export async function searchPlaces(
  search: string,
  signal?: AbortSignal
): Promise<Place[]> {
  const term = search.trim();
  if (term.length < SEARCH.minQueryLength) return [];

  const courses = GOLF.test(term)
    ? []
    : await query(`${term} golf course`, 3, signal);
  const general = await query(term, SEARCH.maxResults, signal);

  const seen = new Set<number>();
  const unique = [...courses, ...general].filter((result) => {
    if (seen.has(result.place_id)) return false;
    seen.add(result.place_id);
    return true;
  });

  return unique.slice(0, SEARCH.maxResults).map(toPlace);
}
