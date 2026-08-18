"use client";

import { useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { enGB } from "date-fns/locale";
import { CalendarDays } from "lucide-react";

import { FORECAST } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * The day of the round.
 *
 * Bounded by what can actually be answered: the forecast runs a fortnight or
 * so ahead and the archive reaches back to 1940, so anything outside that
 * would only produce an error further down. The year is a dropdown because
 * reaching 1974 by clicking a month arrow is six hundred clicks.
 */
export default function DateField({
  id,
  date,
  onChange,
}: {
  id: string;
  date: string;
  onChange: (date: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const selected = date ? parseISO(date) : undefined;
  const first = parseISO(FORECAST.archiveFrom);
  const last = addDays(new Date(), FORECAST.maxDaysAhead);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id={id} variant="outline" className="w-full justify-start font-normal">
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate">
            {selected ? format(selected, "EEEE d MMMM yyyy") : "Pick a date"}
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          locale={enGB}
          selected={selected}
          defaultMonth={selected}
          startMonth={first}
          endMonth={last}
          captionLayout="dropdown"
          disabled={{ before: first, after: last }}
          onSelect={(next) => {
            if (!next) return;
            onChange(format(next, "yyyy-MM-dd"));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
