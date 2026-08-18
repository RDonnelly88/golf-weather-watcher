"use client";

import { useId, useMemo, useState } from "react";
import { format, isToday, parseISO } from "date-fns";

import { OUTLOOK, type Course } from "@/lib/config";
import type { WeekForecast } from "@/lib/forecast";
import { bestSlot, scoreOutlook } from "@/lib/outlook";
import { cn } from "@/lib/utils";
import SlotBreakdown from "@/components/outlook/SlotBreakdown";
import SlotTile from "@/components/outlook/SlotTile";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * The week ahead at the chosen course, three windows a day.
 *
 * One request for the week's hours, scored here rather than upstream, which is
 * what makes changing the round length re-colour the whole grid without asking
 * anybody anything.
 *
 * Only one window is open at a time. Two panels of five bars each in a grid of
 * twenty-one tiles is a page nobody can read, and the question this answers is
 * which window to look at next.
 */
export default function WeekOutlook({
  forecast,
  course,
  length,
  onChoose,
}: {
  forecast: WeekForecast;
  course: Course;
  length: number;
  onChoose: (choice: { date: string; teeTime: string }) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const panelId = useId();
  const titleId = useId();

  const days = useMemo(
    () => scoreOutlook(forecast, length, new Date()),
    [forecast, length]
  );
  const best = useMemo(() => bestSlot(days), [days]);

  return (
    // A landmark of its own: it is a page's worth of answer sitting under
    // another one, and skipping straight to it is a reasonable thing to want.
    <section aria-labelledby={titleId}>
      <Card>
        <CardHeader>
          <CardTitle id={titleId}>The week ahead</CardTitle>
          <CardDescription>
            {course.name}, scored as a {length}-hour round from each of these
            times.{" "}
            {best &&
              `The pick of it is ${best.slot.label.toLowerCase()} on ${format(parseISO(best.date), "EEEE")}.`}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div
            className="grid items-center gap-x-2 gap-y-1"
            style={{ gridTemplateColumns: `minmax(0,auto) repeat(${OUTLOOK.slots.length}, minmax(0,1fr))` }}
          >
            {/* The corner of the grid. `sr-only` would take it out of the flow
                and shift every column heading one place to the left. */}
            <span aria-hidden />
            {OUTLOOK.slots.map((slot) => (
              <p key={slot.key} className="eyebrow pb-1 text-center">
                {slot.label}
              </p>
            ))}

            {days.map((day) => {
              const date = parseISO(day.date);
              const today = isToday(date);

              return (
                <div key={day.date} className="contents">
                  <p
                    className={cn(
                      "py-1 pr-2 text-sm",
                      today ? "font-semibold text-foreground" : "text-muted-foreground"
                    )}
                  >
                    <span className="hidden sm:inline">
                      {today ? "Today" : format(date, "EEEE")}
                    </span>
                    <span className="sm:hidden">
                      {today ? "Today" : format(date, "EEE")}
                    </span>
                    <span className="tabular ml-1.5 text-xs text-muted-foreground">
                      {format(date, "d MMM")}
                    </span>
                  </p>

                  {day.slots.map((slot) => {
                    const key = `${day.date}:${slot.key}`;
                    return (
                      <SlotTile
                        key={key}
                        slot={slot}
                        date={format(date, "EEEE d MMMM")}
                        open={open === key}
                        panelId={`${panelId}-panel`}
                        onToggle={() => setOpen((current) => (current === key ? null : key))}
                      />
                    );
                  })}

                  {/* The panel spans the whole row, under the day it belongs to. */}
                  {day.slots.map((slot) => {
                    const key = `${day.date}:${slot.key}`;
                    if (open !== key || slot.score === null) return null;

                    return (
                      <div
                        key={`${key}-panel`}
                        id={`${panelId}-panel`}
                        className="col-span-full py-2"
                      >
                        <SlotBreakdown
                          round={slot.score}
                          date={day.date}
                          startHour={slot.startHour}
                          length={length}
                          onChoose={() => {
                            setOpen(null);
                            onChoose({
                              date: day.date,
                              teeTime: `${String(slot.startHour).padStart(2, "0")}:00`,
                            });
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
