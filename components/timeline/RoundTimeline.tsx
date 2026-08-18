import type { RoundForecast } from "@/lib/forecast";
import HourRow from "@/components/timeline/HourRow";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function RoundTimeline({ forecast }: { forecast: RoundForecast }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hour by hour</CardTitle>
        <CardDescription>
          {forecast.source === "archive"
            ? "What the weather actually did. Tap an hour for the rest of it."
            : "Tap an hour for everything else known about it."}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <ul className="border-t border-border">
          {forecast.hours.map((hour) => (
            <HourRow key={hour.time} hour={hour} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
