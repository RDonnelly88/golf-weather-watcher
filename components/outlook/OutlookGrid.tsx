"use client";

import { useId, useMemo, useState } from "react";
import { format, isToday, parseISO } from "date-fns";
import { motion } from "motion/react";

import { OUTLOOK, OUTLOOK_HOURS, type Course } from "@/lib/config";
import type { OutlookForecast } from "@/lib/forecast";
import { bestHour, chosenWindow, scoreOutlook, type ChosenRound } from "@/lib/outlook";
import { cn } from "@/lib/utils";
import HeatCell from "@/components/outlook/HeatCell";
import HourDetail from "@/components/outlook/HourDetail";
import { HEAT_STEPS } from "@/components/score/heat";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** Wide enough to tap, which is what decides when the grid starts scrolling. */
const CELL = "2.25rem";

/** Column one is the day's name, so the hours begin at two. */
function columnOf(hour: number): number {
  return hour - OUTLOOK.firstHour + 2;
}

/**
 * The fortnight ahead at the chosen course, an hour at a time.
 *
 * One request for the hours, scored here rather than upstream, so nothing is
 * asked again when anything below changes.
 *
 * The strip under the grid is filled by whatever was last tapped, or failing
 * that whatever is under the pointer, or — before either — by the best hour of
 * the fortnight, so it opens pointing at the answer rather than at nothing.
 * Tapping the held hour again lets go of it.
 *
 * Every item is placed by column and row rather than left to flow. That is
 * what lets the chosen round be drawn as one box over the hours it covers,
 * gaps included, instead of a border around each cell in turn.
 */
export default function OutlookGrid({
  forecast,
  course,
  round,
  onChoose,
}: {
  forecast: OutlookForecast;
  course: Course;
  round: ChosenRound;
  onChoose: (choice: { date: string; teeTime: string }) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const titleId = useId();

  const days = useMemo(() => scoreOutlook(forecast, new Date()), [forecast]);
  const best = useMemo(() => bestHour(days), [days]);

  // Pinning wins over hovering. Tapping an hour is a deliberate act meaning
  // hold this one, and it has to survive the pointer drifting across the grid
  // — or the page scrolling under a pointer that never moved.
  /**
   * Where the chosen round sits, as one placement in the whole grid.
   *
   * Lifted out of the days rather than rendered inside the one it belongs to:
   * an element that moves between parents is unmounted and mounted again, and
   * a thing that is mounted again cannot be animated from where it was.
   */
  const outline = useMemo(() => {
    for (const [index, day] of days.entries()) {
      const window = chosenWindow(round, day.date);
      if (window) {
        return {
          row: index + 2,
          column: columnOf(window.firstHour),
          span: window.lastHour - window.firstHour + 1,
        };
      }
    }
    return null;
  }, [days, round]);

  const activeTime = pinned ?? hovered ?? best?.time ?? null;
  const active = useMemo(
    () =>
      days.flatMap((day) => day.cells).find((cell) => cell.time === activeTime) ??
      null,
    [days, activeTime]
  );

  return (
    // A landmark of its own: it is a page's worth of answer sitting under
    // another one, and skipping straight to it is a reasonable thing to want.
    <section aria-labelledby={titleId}>
      <Card>
        <CardHeader>
          <CardTitle id={titleId}>The fortnight ahead</CardTitle>
          <CardDescription>
            {course.name}, hour by hour, with the round you have set outlined.
            Each cell is that hour on its own, which reads kinder than a whole
            round — less rain falls in one — so find the day here and read the
            round above.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Sideways on a phone: seventeen columns and a day name will not fit
              across four hundred pixels, and shrinking a cell below a
              fingertip is worse than scrolling. The scroll padding keeps the
              pinned day column off whatever was just scrolled to. */}
          <div
            // No horizontal padding: scrolled cells show through it, in a
            // sliver beside the pinned day names.
            className="overflow-x-auto pb-1"
            style={{ scrollPaddingLeft: "5rem" }}
          >
            <div
              className="grid min-w-max gap-1"
              style={{
                gridTemplateColumns: `auto repeat(${OUTLOOK_HOURS.length}, minmax(${CELL}, 1fr))`,
              }}
              onMouseLeave={() => setHovered(null)}
            >
              <span
                className="sticky left-0 z-10 bg-card"
                style={{ gridColumn: 1, gridRow: 1 }}
                aria-hidden
              />
              {OUTLOOK_HOURS.map((hour, column) => (
                <p
                  key={hour}
                  className="tabular pb-0.5 text-center text-[11px] text-muted-foreground"
                  style={{ gridColumn: column + 2, gridRow: 1 }}
                >
                  {String(hour).padStart(2, "0")}
                </p>
              ))}

              {days.map((day, index) => {
                const date = parseISO(day.date);
                const today = isToday(date);
                const row = index + 2;
                const chosen = chosenWindow(round, day.date);

                return (
                  <div key={day.date} className="contents">
                    <p
                      className={cn(
                        // Pinned, so the day is still readable once the grid
                        // has been scrolled sideways.
                        "sticky left-0 z-10 flex items-center bg-card pr-2 text-sm",
                        today ? "font-semibold text-foreground" : "text-muted-foreground"
                      )}
                      style={{ gridColumn: 1, gridRow: row }}
                    >
                      {today ? "Today" : format(date, "EEE")}
                      <span className="tabular ml-1.5 text-xs text-muted-foreground">
                        {format(date, "d MMM")}
                      </span>
                    </p>

                    {day.cells.map((cell) => (
                      <HeatCell
                        key={cell.time}
                        cell={cell}
                        column={columnOf(cell.hour)}
                        row={row}
                        chosen={
                          chosen !== null &&
                          cell.hour >= chosen.firstHour &&
                          cell.hour <= chosen.lastHour
                        }
                        selected={activeTime === cell.time}
                        onShow={() => setHovered(cell.time)}
                        onPin={() =>
                          setPinned((current) =>
                            current === cell.time ? null : cell.time
                          )
                        }
                      />
                    ))}
                  </div>
                );
              })}

              {outline && (
                /* Laid over the hours it covers, half a gap proud of them on
                   each side, so it reads as one window rather than as four
                   cells that happen to be outlined. `layout` is what makes it
                   travel to a new tee time instead of appearing at one. */
                <motion.span
                  aria-hidden
                  layout
                  transition={{ type: "spring", stiffness: 90, damping: 18 }}
                  className="pointer-events-none z-20 -m-0.5 rounded-md border-2 border-accent"
                  style={{
                    gridColumn: `${outline.column} / span ${outline.span}`,
                    gridRow: outline.row,
                  }}
                />
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
            <span className="flex items-center gap-1.5">
              <span
                className="h-3 w-5 rounded-sm border-2 border-accent"
                aria-hidden
              />
              <span className="eyebrow">Your round</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="eyebrow">Worse</span>
              <span className="flex gap-0.5" aria-hidden>
                {HEAT_STEPS.map((fill) => (
                  <span key={fill} className={cn("h-2.5 w-5 rounded-sm", fill)} />
                ))}
              </span>
              <span className="eyebrow">Better</span>
            </span>
          </div>

          <HourDetail cell={active} onChoose={onChoose} />
        </CardContent>
      </Card>
    </section>
  );
}
