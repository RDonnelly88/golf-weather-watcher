"use client";

import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { cn } from "@/lib/utils";

// The root's props are a union of the single- and multiple-select shapes;
// narrowing before omitting keeps `defaultValue` a string rather than
// widening it to cover both.
type RootProps = React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root>;
type SingleProps = Extract<RootProps, { type: "single" }>;

/**
 * A row of choices where exactly one is picked, in a pill.
 *
 * Built on Radix's toggle group rather than a row of `aria-pressed` buttons.
 * Buttons put every option in the tab order and tell a screen reader they are
 * independent switches, when only one can be on; the group is one stop with
 * the arrow keys moving between them, which is what a set of choices is.
 *
 * Selecting is one-way on purpose: pressing the option already chosen leaves
 * it chosen. There is no unset state to fall into, and the underlying control
 * would otherwise hand back an empty string.
 */
const SegmentedControl = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  Omit<SingleProps, "type" | "value" | "onValueChange"> & {
    value: string;
    onValueChange: (value: string) => void;
    /** Named for a screen reader, since the pill carries no visible label. */
    label: string;
  }
>(({ className, value, onValueChange, label, ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    type="single"
    value={value}
    onValueChange={(next) => next && onValueChange(next)}
    aria-label={label}
    className={cn(
      "flex w-fit items-center gap-0.5 rounded-full border border-border bg-surface p-1",
      className
    )}
    {...props}
  />
));
SegmentedControl.displayName = "SegmentedControl";

const SegmentedControlItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <ToggleGroupPrimitive.Item
    ref={ref}
    className={cn(
      "focus-ring flex items-center gap-1.5 rounded-full transition-colors",
      "text-muted-foreground hover:text-foreground",
      "data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",
      "disabled:pointer-events-none disabled:opacity-50",
      className
    )}
    {...props}
  />
));
SegmentedControlItem.displayName = "SegmentedControlItem";

export { SegmentedControl, SegmentedControlItem };
