import { format, parseISO } from "date-fns";

import { finishTime, type RoundForecast } from "@/lib/forecast";
import type { RoundSettings } from "@/hooks/useRoundSettings";
import { Badge } from "@/components/ui/badge";

/**
 * What the scores below are answering: where, when, and for how long.
 *
 * The badge says which model spoke. "Recorded" and "Forecast" are different
 * claims about the same numbers, and a reader looking at a date from 2019 has
 * no other way to tell that this is what happened rather than a guess.
 */
export default function RoundHeading({
  settings,
  forecast,
}: {
  settings: RoundSettings;
  forecast: RoundForecast;
}) {
  const finish = finishTime(settings.teeTime, settings.length);

  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <h2 className="section-title">{settings.course.name}</h2>
      <p className="text-sm text-muted-foreground">
        {settings.date && format(parseISO(settings.date), "EEEE d MMMM yyyy")},{" "}
        <span className="tabular">
          {settings.teeTime}–{finish.clock}
        </span>
      </p>
      <Badge variant={forecast.source === "archive" ? "secondary" : "outline"}>
        {forecast.source === "archive" ? "Recorded" : "Forecast"}
      </Badge>
    </div>
  );
}
