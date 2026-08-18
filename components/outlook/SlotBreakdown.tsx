"use client";

import { format, parseISO } from "date-fns";

import { finishTime } from "@/lib/forecast";
import { toneFor, type RoundScore } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import { ScoreBar } from "@/components/score/ScoreBar";
import { TONE } from "@/components/score/tone";
import { Button } from "@/components/ui/button";

/**
 * Why a window scored what it scored.
 *
 * The same five factors as the round above it, a line each rather than five
 * cards — this is a glance inside a grid, not the page's main answer. The
 * button hands the window to the form, which is the point of finding a good
 * one.
 */
export default function SlotBreakdown({
  round,
  date,
  startHour,
  length,
  onChoose,
}: {
  round: RoundScore;
  date: string;
  startHour: number;
  length: number;
  onChoose: () => void;
}) {
  const teeTime = `${String(startHour).padStart(2, "0")}:00`;
  const finish = finishTime(teeTime, length);

  return (
    <div className="rounded-lg border border-border bg-surface-2/40 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="pretty text-sm font-medium">{round.verdict}</p>
        <Button size="sm" variant="outline" onClick={onChoose}>
          Take a proper look
        </Button>
      </div>

      <dl className="mt-3 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
        {round.factors.map((factor) => (
          <div key={factor.key}>
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-xs font-medium">{factor.label}</dt>
              <dd className="tabular truncate text-xs text-muted-foreground">
                {factor.reading}
              </dd>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <ScoreBar score={factor.score} className="h-1.5 flex-1" />
              <span
                className={cn(
                  "tabular w-7 shrink-0 text-right text-xs font-medium",
                  TONE[toneFor(factor.score)].text
                )}
              >
                {factor.score}
              </span>
            </div>
          </div>
        ))}
      </dl>

      <p className="mt-3 text-xs text-muted-foreground">
        {format(parseISO(date), "EEEE d MMMM")}, teeing off at{" "}
        <span className="tabular">{teeTime}</span> and back in the clubhouse by{" "}
        <span className="tabular">{finish.clock}</span>.
      </p>
    </div>
  );
}
