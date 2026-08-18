"use client";

import type { RoundSettings } from "@/hooks/useRoundSettings";
import CourseField from "@/components/round/CourseField";
import DateField from "@/components/round/DateField";
import TeeTimeField from "@/components/round/TeeTimeField";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

/**
 * The round being asked about.
 *
 * There is no button. Every control writes straight through to the query
 * below, so the form and the scores can never describe different rounds —
 * which is the whole failure mode of a form you have to submit.
 */
export default function RoundForm({
  settings,
  onChange,
}: {
  settings: RoundSettings;
  onChange: (changes: Partial<RoundSettings>) => void;
}) {
  return (
    <Card>
      <CardContent className="grid gap-4 p-4 md:grid-cols-3 md:p-6">
        <div className="space-y-1.5 md:col-span-1">
          <Label htmlFor="course">Course</Label>
          <CourseField
            id="course"
            course={settings.course}
            onChange={(course) => onChange({ course })}
          />
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
