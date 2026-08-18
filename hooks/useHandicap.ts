"use client";

import { useCallback, useEffect, useState } from "react";
import { z } from "zod";

import type { TeeSet } from "@/lib/handicap";

const STORAGE_KEY = "golf-weather-watcher-handicap";

/**
 * Checked rather than trusted, the same as the round settings and the saved
 * courses. A slope of nought would divide the whole card by zero, and a rating
 * typed into the wrong box should be refused here rather than three components
 * later.
 */
const NineSchema = z.object({
  par: z.number().min(20).max(60),
  courseRating: z.number().min(20).max(60),
  slopeRating: z.number().min(55).max(155),
});

const TeeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  par: z.number().min(40).max(100),
  courseRating: z.number().min(40).max(100),
  slopeRating: z.number().min(55).max(155),
  nine: NineSchema.optional(),
});

const StoredSchema = z.object({
  /** Null until somebody says what theirs is. Negative is a plus handicap. */
  index: z.number().min(-10).max(54).nullable(),
  /** Keyed by `courseKey`, because a course is rated from every set of tees. */
  tees: z.record(z.string(), z.array(TeeSchema)),
  /** The tees you last played there, so the card opens on them. */
  chosen: z.record(z.string(), z.string()),
});

type Stored = z.infer<typeof StoredSchema>;

const EMPTY: Stored = { index: null, tees: {}, chosen: {} };

/**
 * Your handicap, and the tees you play at each course.
 *
 * All of it lives in this browser. There is no account to put it against, and
 * a handicap index is the sort of thing somebody might not want on a server
 * anyway.
 *
 * Course ratings are typed in rather than looked up: no free service publishes
 * them, so the numbers come off the card once and are remembered. Nothing is
 * seeded — a course rating invented for the sake of having one would be
 * indistinguishable from a real one, and wrong.
 */
export function useHandicap() {
  const [stored, setStored] = useState<Stored>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? StoredSchema.safeParse(JSON.parse(raw)) : null;
      if (parsed?.success) setStored(parsed.data);
    } catch {
      // A corrupt entry is the same as no entry.
    }
    setReady(true);
  }, []);

  const write = useCallback((next: Stored) => {
    setStored(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Private browsing, a full quota — the app works, it just forgets.
    }
  }, []);

  const setIndex = useCallback(
    (index: number | null) => write({ ...stored, index }),
    [stored, write]
  );

  const teesFor = useCallback(
    (courseKey: string): TeeSet[] => stored.tees[courseKey] ?? [],
    [stored]
  );

  const chosenFor = useCallback(
    (courseKey: string): string | null => stored.chosen[courseKey] ?? null,
    [stored]
  );

  const choose = useCallback(
    (courseKey: string, teeId: string) =>
      write({ ...stored, chosen: { ...stored.chosen, [courseKey]: teeId } }),
    [stored, write]
  );

  /** Adds a set of tees, or replaces the one with the same id. */
  const saveTee = useCallback(
    (courseKey: string, tee: TeeSet) => {
      const existing = stored.tees[courseKey] ?? [];
      const known = existing.some((candidate) => candidate.id === tee.id);

      write({
        ...stored,
        tees: {
          ...stored.tees,
          [courseKey]: known
            ? existing.map((candidate) => (candidate.id === tee.id ? tee : candidate))
            : [...existing, tee],
        },
        // Newly added tees are the ones you are about to play.
        chosen: { ...stored.chosen, [courseKey]: tee.id },
      });
    },
    [stored, write]
  );

  const removeTee = useCallback(
    (courseKey: string, teeId: string) => {
      const left = (stored.tees[courseKey] ?? []).filter((tee) => tee.id !== teeId);
      const chosen = { ...stored.chosen };
      if (chosen[courseKey] === teeId) delete chosen[courseKey];

      write({ ...stored, tees: { ...stored.tees, [courseKey]: left }, chosen });
    },
    [stored, write]
  );

  return {
    ready,
    index: stored.index,
    setIndex,
    teesFor,
    chosenFor,
    choose,
    saveTee,
    removeTee,
  };
}
