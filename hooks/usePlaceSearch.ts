"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchPlaces } from "@/lib/api";
import { SEARCH } from "@/lib/config";
import type { Place } from "@/lib/places";

/**
 * Course search, one request per pause rather than one per keystroke.
 *
 * The debounce is in front of the query key rather than around the fetch, so
 * React Query still owns caching and cancellation: typing "carnou" and then
 * deleting back to a term already searched costs nothing.
 */
export function usePlaceSearch(term: string) {
  const [settled, setSettled] = useState(term);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(term), SEARCH.debounceMs);
    return () => clearTimeout(timer);
  }, [term]);

  const query = useQuery<Place[]>({
    queryKey: ["places", settled],
    queryFn: ({ signal }) => fetchPlaces(settled, signal),
    enabled: settled.trim().length >= SEARCH.minQueryLength,
  });

  return {
    ...query,
    /** True while the typing has outrun the last search. */
    pending: settled !== term,
  };
}
