"use client";

/*
 * A named group of related readings has no native tag: the ones the rule
 * suggests are a form's fieldset, an address, a disclosure. This is a labelled
 * region of supplementary content, which is what `group` is for, and naming it
 * is what lets a screen reader — and a test — find it.
 */
/* eslint-disable jsx-a11y/prefer-tag-over-role */

import { format, parseISO } from "date-fns";

import type { HourCell } from "@/lib/outlook";
import { toneFor } from "@/lib/scoring";
import { compassPoint } from "@/lib/wind";
import { cn } from "@/lib/utils";
import { ScoreBar } from "@/components/score/ScoreBar";
import { TONE } from "@/components/score/tone";
import { SkyIcon } from "@/components/timeline/SkyIcon";
import { Button } from "@/components/ui/button";

/**
 * Everything about the hour under the pointer.
 *
 * A strip under the grid rather than a tooltip on the cell. A tooltip belongs
 * to the mouse: it can't be reached by a keyboard, it doesn't survive a tap,
 * and there is no room in one for five factor bars. This fills on hover, on
 * focus and on tap alike, and holds its height so the page doesn't jump as the
 * pointer crosses the grid.
 */
const LABEL = "The hour you're looking at";

export default function HourDetail({
  cell,
  onChoose,
}: {
  cell: HourCell | null;
  onChoose: (choice: { date: string; teeTime: string }) => void;
}) {
  if (cell === null || cell.score === null || cell.reading === null) {
    return (
      <p
        role="group"
        aria-label={LABEL}
        className="flex min-h-[9.5rem] items-center justify-center rounded-lg border border-dashed border-border p-3 text-center text-sm text-muted-foreground"
      >
        Point at an hour to see what it's doing.
      </p>
    );
  }

  const { reading, score } = cell;
  const date = cell.time.slice(0, 10);
  const clock = `${String(cell.hour).padStart(2, "0")}:00`;
  const tone = TONE[toneFor(score.overall)];

  return (
    <div
      role="group"
      aria-label={LABEL}
      className="min-h-[9.5rem] rounded-lg border border-border bg-surface-2/40 p-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-medium">
            {cell.sky && <SkyIcon kind={cell.sky.kind} className="h-4 w-4" />}
            <span className="tabular">{clock}</span>
            <span className="truncate text-muted-foreground">
              {format(parseISO(date), "EEEE d MMMM")}
            </span>
          </p>
          <p className="tabular mt-1 text-sm text-muted-foreground">
            {Math.round(reading.temperature)}°C, feels like{" "}
            {Math.round(reading.feelsLike)}°C · {Math.round(reading.windSpeed)} mph{" "}
            {compassPoint(reading.windDirection)}
            {reading.windGust !== null && reading.windGust > reading.windSpeed + 2 &&
              `, gusting ${Math.round(reading.windGust)}`}{" "}
            · {Math.round(reading.cloudCover)}% cloud ·{" "}
            {reading.rainfall > 0 ? `${reading.rainfall.toFixed(1)} mm` : "dry"}
            {reading.rainChance !== null && ` (${Math.round(reading.rainChance)}%)`}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <p className={cn("tabular text-2xl font-bold leading-none", tone.text)}>
            {score.overall}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onChoose({ date, teeTime: clock })}
          >
            Take a proper look
          </Button>
        </div>
      </div>

      <dl className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {score.factors.map((factor) => (
          <div key={factor.key} className="flex items-center gap-2">
            <dt className="w-20 shrink-0 text-xs text-muted-foreground">
              {factor.label}
            </dt>
            <dd className="flex min-w-0 flex-1 items-center gap-2">
              <ScoreBar score={factor.score} className="h-1.5 flex-1" />
              <span
                className={cn(
                  "tabular w-7 shrink-0 text-right text-xs font-medium",
                  TONE[toneFor(factor.score)].text
                )}
              >
                {factor.score}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
