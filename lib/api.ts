import type { RoundForecast, RoundRequest } from "@/lib/forecast";
import type { Place } from "@/lib/places";

/**
 * The browser's half of the two route handlers.
 *
 * Both of them answer a failure as `{ error }` with a sentence in it, so the
 * one thing every caller needs is to turn that back into a thrown Error with
 * the sentence intact — React Query surfaces `error.message`, and a reader
 * deserves "that date is beyond the forecast" rather than "502".
 */
async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const reason =
      body && typeof body === "object" && "error" in body && typeof body.error === "string"
        ? body.error
        : "Something went wrong fetching that.";
    throw new Error(reason);
  }

  return (await response.json()) as T;
}

export function fetchForecast(
  request: RoundRequest,
  signal?: AbortSignal
): Promise<RoundForecast> {
  const params = new URLSearchParams({
    latitude: String(request.latitude),
    longitude: String(request.longitude),
    date: request.date,
    startHour: String(request.startHour),
    length: String(request.length),
  });

  return getJson<RoundForecast>(`/api/forecast?${params}`, signal);
}

export function fetchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  return getJson<Place[]>(`/api/places?q=${encodeURIComponent(query)}`, signal);
}
