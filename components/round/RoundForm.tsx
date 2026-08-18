"use client";

import { Star } from "lucide-react";

import type { RoundSettings } from "@/hooks/useRoundSettings";
import type { useFavouriteCourses } from "@/hooks/useFavouriteCourses";
import CourseField from "@/components/round/CourseField";
import DateField from "@/components/round/DateField";
import TeeTimeField from "@/components/round/TeeTimeField";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * The round being asked about.
 *
 * There is no button. Every control writes straight through to the query
 * below, so the form and the scores can never describe different rounds —
 * which is the whole failure mode of a form you have to submit.
 */
export default function RoundForm({
  settings,
  favourites,
  onChange,
}: {
  settings: RoundSettings;
  favourites: ReturnType<typeof useFavouriteCourses>;
  onChange: (changes: Partial<RoundSettings>) => void;
}) {
  // Saving and unsaving are the same control, which is why the course has to
  // be chosen before it can be kept. It also means the list can only ever hold
  // courses that have actually been looked at.
  const kept = favourites.ready && favourites.isSaved(settings.course);

  return (
    <Card>
      <CardContent className="grid gap-4 p-4 md:grid-cols-3 md:p-6">
        <div className="space-y-1.5 md:col-span-1">
          <Label htmlFor="course">Course</Label>
          <div className="flex gap-2">
            <div className="min-w-0 flex-1">
              <CourseField
                id="course"
                course={settings.course}
                saved={favourites.courses}
                onChange={(course) => onChange({ course })}
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              aria-pressed={kept}
              // The icon alone says which way this goes; the label says what
              // pressing it would do next.
              aria-label={kept ? "Remove from your courses" : "Save to your courses"}
              title={kept ? "Remove from your courses" : "Save to your courses"}
              onClick={() => favourites.toggle(settings.course)}
              disabled={!favourites.ready}
            >
              <Star
                className={cn("h-4 w-4", kept && "fill-current text-accent")}
                aria-hidden
              />
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="date">Date</Label>
          <DateField id="date" date={settings.date} onChange={(date) => onChange({ date })} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tee-time">Tee time and round</Label>
          <TeeTimeField
            id="tee-time"
            teeTime={settings.teeTime}
            length={settings.length}
            onChange={onChange}
          />
        </div>
      </CardContent>
    </Card>
  );
}
