"use client";

import { useCallback, useEffect, useState } from "react";
import { z } from "zod";

import { courseKey, type Course } from "@/lib/config";

const STORAGE_KEY = "golf-weather-watcher-favourites";

/**
 * Checked rather than trusted, the same as the round settings: an entry
 * written by an older shape of the app, or edited by hand, must not reach a
 * URL as a course with no latitude.
 */
const StoredSchema = z.array(
  z.object({
    name: z.string().min(1),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  })
);

/**
 * The courses somebody plays, kept in this browser.
 *
 * Held in insertion order rather than sorted: a list that rearranges itself
 * every time it grows is a list you have to read, and the point of it is not
 * having to. Nothing is seeded into it — an empty list falls back to the
 * popular shortlist, which is a constant and stays one.
 */
export function useFavouriteCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  // Nothing may render off this list until it has been read: the server has no
  // localStorage, so a saved course drawn on the first pass is a mismatch.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? StoredSchema.safeParse(JSON.parse(raw)) : null;
      if (parsed?.success) setCourses(parsed.data);
    } catch {
      // A corrupt entry is the same as no entry.
    }
    setReady(true);
  }, []);

  const isSaved = useCallback(
    (course: Course) =>
      courses.some((saved) => courseKey(saved) === courseKey(course)),
    [courses]
  );

  const toggle = useCallback((course: Course) => {
    setCourses((current) => {
      const key = courseKey(course);
      const without = current.filter((saved) => courseKey(saved) !== key);
      // Toggling off is the removal; toggling on appends, so the order people
      // added them in is the order they see.
      const next =
        without.length === current.length ? [...current, course] : without;

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Private browsing, a full quota — the app works, it just forgets.
      }

      return next;
    });
  }, []);

  return { courses, ready, isSaved, toggle };
}
