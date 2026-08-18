"use client";

import { format, parseISO } from "date-fns";
import { Moon } from "lucide-react";

import type { HourCell } from "@/lib/outlook";
import { cn } from "@/lib/utils";
import { heatFill } from "@/components/score/heat";
import { SkyIcon } from "@/components/timeline/SkyIcon";

/**
 * One hour of one day.
 *
 * Colour carries the score and the icon carries the sky, which is why the
 * accessible name spells the score out: a grid where the number exists only as
 * a shade is a grid that says nothing to a screen reader and not much to
 * anybody who can't separate the middle of the ramp.
 *
 * A button rather than a cell with a hover handler — hovering is a convenience
 * for a mouse, and focusing and tapping have to reach the same detail.
 *
 * The name says everything the strip below would: the strip is a convenience
 * for the eye, and pointing every cell at it with `aria-describedby` would
 * read the whole thing out again on each of the hundred and nineteen.
 */
export default function HeatCell({
  cell,
  selected,
  onShow,
  onPin,
}: {
  cell: HourCell;
  selected: boolean;
  /** Hover or focus: fill the strip without committing to anything. */
  onShow: () => void;
  /** Tap or Enter: hold it there. */
  onPin: () => void;
}) {
  const clock = `${String(cell.hour).padStart(2, "0")}:00`;
  const when = `${clock} on ${format(parseISO(cell.time.slice(0, 10)), "EEEE d MMMM")}`;

  if (cell.score === null || cell.reading === null) {
    return (
      <div
        className="h-9 rounded border border-dashed border-border"
        title={`No forecast for ${when}`}
      />
    );
  }

  if (cell.dark) {
    return (
      <div
        className="flex h-9 items-center justify-center rounded border border-border bg-surface-2/60"
        title={`Dark at ${when}`}
      >
        <Moon className="h-3 w-3 text-muted-foreground/60" aria-hidden />
        <span className="sr-only">Dark at {when}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onMouseEnter={onShow}
      onFocus={onShow}
      onClick={onPin}
      aria-pressed={selected}
      className={cn(
        "focus-ring flex h-9 items-center justify-center rounded transition-[filter,outline] text-score-foreground",
        heatFill(cell.score.overall),
        // Already been and gone: still worth seeing the shape of, not worth
        // considering.
        cell.past && "opacity-35",
        selected
          ? "outline outline-2 outline-offset-1 outline-ring"
          : "hover:brightness-110"
      )}
    >
      {cell.sky && <SkyIcon kind={cell.sky.kind} className="h-4 w-4 text-current" />}
      <span className="sr-only">
        {cell.score.overall} out of 100, {when}, {cell.sky?.label}
        {cell.past && ", already gone"}
      </span>
    </button>
  );
}
