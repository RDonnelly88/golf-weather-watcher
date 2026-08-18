"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { z } from "zod";

import { DEFAULT_COURSE, ROUND, type Course } from "@/lib/config";

const STORAGE_KEY = "golf-weather-watcher-settings";

export interface RoundSettings {
  course: Course;
  /** yyyy-MM-dd. Empty until the browser has told us what day it is. */
  date: string;
  /** HH:mm, local to the course. */
  teeTime: string;
  /** Whole hours. */
  length: number;
}

/**
 * What came out of localStorage is checked rather than trusted. An earlier
 * version of the app stored a different shape under a different key, and a
 * half-recognised object is worse than none — it puts a course with no
 * latitude into a URL and the failure surfaces three layers away.
 */
const StoredSchema = z.object({
  course: z.object({
    name: z.string().min(1),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  teeTime: z.string().regex(/^\d{2}:\d{2}$/),
  length: z.number().int().positive(),
});

const INITIAL: RoundSettings = {
  course: DEFAULT_COURSE,
  date: "",
  teeTime: ROUND.defaultTeeTime,
  length: ROUND.defaultLength,
};

/**
 * The round being asked about, remembered between visits.
 *
 * The date starts empty and fills in on mount. Today is a fact only the
 * browser has — rendering the server's idea of it and then correcting it is a
 * hydration mismatch — and everything that reads these settings waits for
 * `ready` rather than acting on a half-formed round.
 */
export function useRoundSettings() {
  const [settings, setSettings] = useState<RoundSettings>(INITIAL);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const today = format(new Date(), "yyyy-MM-dd");

    let stored: Partial<RoundSettings> = {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? StoredSchema.safeParse(JSON.parse(raw)) : null;
      if (parsed?.success) stored = parsed.data;
    } catch {
      // A corrupt entry is the same as no entry.
    }

    setSettings({ ...INITIAL, date: today, ...stored });
    setReady(true);
  }, []);

  const update = useCallback((changes: Partial<RoundSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...changes };
      try {
        // The date is deliberately not kept: coming back tomorrow to yesterday's
        // round is never what was meant.
        const { course, teeTime, length } = next;
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ course, teeTime, length }));
      } catch {
        // Private browsing, a full quota — the app works, it just forgets.
      }
      return next;
    });
  }, []);

  return { settings, ready, update };
}
