"use client";

import { toneFor } from "@/lib/scoring";
import type { ScoredSlot } from "@/lib/outlook";
import { cn } from "@/lib/utils";
import { TONE } from "@/components/score/tone";
import { SkyIcon } from "@/components/timeline/SkyIcon";

/**
 * One window of one day: a sky and a score, in the colour the score earns.
 *
 * A window with nothing to say still takes its place in the grid rather than
 * collapsing it — a row of three that sometimes has two in it is a row you
 * have to count.
 */
export default function SlotTile({
  slot,
  date,
  open,
  panelId,
  onToggle,
}: {
  slot: ScoredSlot;
  /** Read out with the slot's name, so the button says which one it is. */
  date: string;
  open: boolean;
  panelId: string;
  onToggle: () => void;
}) {
  if (slot.score === null) {
    return (
      <div
        className="flex h-11 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground"
        aria-label={slot.past ? "Been and gone" : "Beyond the forecast"}
      >
        <span aria-hidden>—</span>
      </div>
    );
  }

  const tone = TONE[toneFor(slot.score.overall)];

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={panelId}
      className={cn(
        "focus-ring flex h-11 items-center justify-center gap-2 rounded-lg border transition-colors",
        tone.soft,
        open ? "ring-2 ring-ring ring-offset-1 ring-offset-surface" : "hover:brightness-105"
      )}
    >
      {slot.sky && <SkyIcon kind={slot.sky} className="h-4 w-4" />}
      <span className="tabular text-base font-bold">{slot.score.overall}</span>
      <span className="sr-only">
        out of 100, {slot.label.toLowerCase()} on {date}
      </span>
    </button>
  );
}
