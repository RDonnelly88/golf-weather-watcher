"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchOutlook } from "@/lib/api";
import type { OutlookForecast } from "@/lib/forecast";
import type { Course } from "@/lib/config";

/**
 * The week ahead at one course.
 *
 * Keyed on the course alone. The round length decides how each window is
 * scored but not what weather is in it, so changing it re-scores what is
 * already here rather than asking again.
 */
export function useOutlook(course: Course, ready: boolean) {
  return useQuery<OutlookForecast>({
    queryKey: ["outlook", course.latitude, course.longitude],
    queryFn: ({ signal }) => fetchOutlook(course, signal),
    enabled: ready,
  });
}
