"use client";

import { useId, useMemo, useState } from "react";
import { format, isToday, parseISO } from "date-fns";

import { OUTLOOK_HOURS, type Course } from "@/lib/config";
import type { WeekForecast } from "@/lib/forecast";
import { bestHour, scoreOutlook } from "@/lib/outlook";
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

/**
 * The week ahead at the chosen course, an hour at a time.
 *
 * One request for the week's hours, scored here rather than upstream, so
 * nothing is asked again when anything below changes.
 *
 * The strip under the grid is filled by whatever is under the pointer, or by
 * whatever was last tapped, or — before either — by the best hour of the week,
 * so it opens pointing at the answer rather than at nothing.
 */
export default function WeekOutlook({
  forecast,
  course,
  onChoose,
}: {
  forecast: WeekForecast;
  course: Course;
  onChoose: (choice: { date: string; teeTime: string }) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const titleId = useId();

  const days = useMemo(() => scoreOutlook(forecast, new Date()), [forecast]);
  const best = useMemo(() => bestHour(days), [days]);

  const activeTime = hovered ?? pinned ?? best?.time ?? null;
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
          <CardTitle id={titleId}>The week ahead</CardTitle>
          <CardDescription>
            {course.name}, hour by hour. Each cell is that hour on its own,
            which reads kinder than a whole round — less rain falls in one — so
            find the day here and read the round above.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Sideways on a phone: seventeen columns and a day name will not fit
              across four hundred pixels, and shrinking a cell below a
              fingertip is worse than scrolling. */}
          {/* The scroll padding keeps the pinned day column from landing on
              top of whatever was just scrolled to. */}
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
              <span className="sticky left-0 z-10 bg-card" aria-hidden />
              {OUTLOOK_HOURS.map((hour) => (
                <p
                  key={hour}
                  className="tabular pb-0.5 text-center text-[11px] text-muted-foreground"
                >
                  {String(hour).padStart(2, "0")}
                </p>
              ))}

              {days.map((day) => {
                const date = parseISO(day.date);
                const today = isToday(date);

                return (
                  <div key={day.date} className="contents">
                    <p
                      className={cn(
                        // Pinned, so the day is still readable once the grid
                        // has been scrolled sideways.
                        "sticky left-0 z-10 flex items-center bg-card pr-2 text-sm",
                        today ? "font-semibold text-foreground" : "text-muted-foreground"
                      )}
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
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <span className="eyebrow">Worse</span>
            <span className="flex gap-0.5" aria-hidden>
              {HEAT_STEPS.map((fill) => (
                <span key={fill} className={cn("h-2.5 w-5 rounded-sm", fill)} />
              ))}
            </span>
            <span className="eyebrow">Better</span>
          </div>

          <HourDetail cell={active} onChoose={onChoose} />
        </CardContent>
      </Card>
    </section>
  );
}
