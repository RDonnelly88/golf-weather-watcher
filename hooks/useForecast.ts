"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchForecast } from "@/lib/api";
import type { RoundForecast } from "@/lib/forecast";
import type { RoundSettings } from "@/hooks/useRoundSettings";

/** The tee time as an hour of the day, which is all the model is asked for. */
export function startHourOf(settings: RoundSettings): number {
  return Number(settings.teeTime.slice(0, 2));
}

/**
 * The forecast for the round currently described by the form.
 *
 * Keyed on everything the answer depends on, so changing the tee time asks a
 * new question and changing it back is free. It runs on its own rather than
 * behind a button: there is no state where the form says one thing and the
 * scores below it describe another.
 */
export function useForecast(settings: RoundSettings, ready: boolean) {
  const { course, date, length } = settings;
  const startHour = startHourOf(settings);

  return useQuery<RoundForecast>({
    queryKey: [
      "forecast",
      course.latitude,
      course.longitude,
      date,
      startHour,
      length,
    ],
    queryFn: ({ signal }) =>
      fetchForecast(
        {
          latitude: course.latitude,
          longitude: course.longitude,
          date,
          startHour,
          length,
        },
        signal
      ),
    enabled: ready && date !== "",
  });
}
