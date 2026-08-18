"use client";

import * as React from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "space-y-4",
        month_caption: "flex justify-center pt-1 relative items-center h-7",
        /*
         * With `captionLayout="dropdown"` each dropdown is a native <select>
         * laid over a span showing the same label. The select carries the
         * behaviour and the span carries the look, so the select is stretched
         * over it and made invisible — without that they both draw and the
         * caption reads "August ⌄August".
         */
        dropdowns: "flex items-center gap-1.5",
        dropdown_root: "relative inline-flex items-center",
        dropdown:
          "absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0",
        caption_label: "flex items-center gap-0.5 text-sm font-medium",
        nav: "absolute inset-x-1 top-4 flex items-center justify-between z-10",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        week: "flex w-full mt-2",
        day: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        /*
         * The colour goes on the cell but the text is inside a button that
         * sets its own, so the button has to be told too — otherwise the
         * selected day is a dark figure on a dark green square.
         */
        selected:
          "bg-primary text-primary-foreground [&>button]:text-primary-foreground hover:bg-primary focus:bg-primary",
        today: "bg-accent/15 font-semibold [&>button]:text-accent",
        outside:
          "text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        disabled: "text-muted-foreground opacity-50",
        range_end: "rounded-r-md",
        range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        // One component for every arrow in the calendar, told which way it
        // points: left and right move the month, down opens a dropdown.
        Chevron: ({ orientation, ...iconProps }) => {
          const Icon =
            orientation === "left"
              ? ChevronLeft
              : orientation === "down"
                ? ChevronDown
                : ChevronRight;
          return <Icon className="h-4 w-4 opacity-60" {...iconProps} />;
        },
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
