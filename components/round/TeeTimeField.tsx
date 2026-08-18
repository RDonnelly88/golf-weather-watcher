"use client";

import { ROUND } from "@/lib/config";
import { finishTime } from "@/lib/forecast";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * When you tee off and how long you'll be out.
 *
 * The two sit together because neither means much alone — the score covers the
 * hours you are actually on the course, and a four-hour round from six o'clock
 * is a different question from a two-hour one.
 */
export default function TeeTimeField({
  id,
  teeTime,
  length,
  onChange,
}: {
  id: string;
  teeTime: string;
  length: number;
  onChange: (changes: { teeTime?: string; length?: number }) => void;
}) {
  const finish = finishTime(teeTime, length);

  return (
    <div>
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            id={id}
            type="time"
            value={teeTime}
            onChange={(event) => {
              // An emptied time field reports "", which is not a round.
              if (event.target.value) onChange({ teeTime: event.target.value });
            }}
            className="tabular"
          />
        </div>

        <Select
          value={String(length)}
          onValueChange={(next) => onChange({ length: Number(next) })}
        >
          <SelectTrigger className="w-32" aria-label="Round length">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROUND.lengths.map((hours) => (
              <SelectItem key={hours} value={String(hours)}>
                {hours} hours
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="mt-1.5 text-xs text-muted-foreground">
        Back in the clubhouse by{" "}
        <span className="tabular">{finish.clock}</span>
        {finish.nextDay && " the next day"}.
      </p>
    </div>
  );
}
