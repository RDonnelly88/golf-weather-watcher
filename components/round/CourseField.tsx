"use client";

/*
 * A combobox has no native tag to prefer over the role: <select> cannot hold a
 * free-text query and <datalist> can neither be styled nor read from. The
 * pattern below is the one the ARIA practices guide describes.
 */
/* eslint-disable jsx-a11y/prefer-tag-over-role */

import { useId, useMemo, useRef, useState } from "react";
import { ChevronsUpDown, Flag, LoaderCircle, MapPin, Search } from "lucide-react";

import { FAVOURITE_COURSES, SEARCH, type Course } from "@/lib/config";
import type { Place } from "@/lib/places";
import { usePlaceSearch } from "@/hooks/usePlaceSearch";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Option {
  key: string;
  course: Course;
  detail: string;
  golf: boolean;
}

const favourites: Option[] = FAVOURITE_COURSES.map((course) => ({
  key: course.name,
  course,
  detail: "",
  golf: true,
}));

function toOption(place: Place): Option {
  return {
    key: place.id,
    course: {
      name: place.name,
      latitude: place.latitude,
      longitude: place.longitude,
    },
    detail: place.detail,
    golf: place.kind === "golf",
  };
}

/**
 * Where you're playing.
 *
 * A combobox rather than a text field with a list of divs under it: the
 * options are one stop in the tab order, the arrow keys move between them, and
 * the input says what it controls, so the whole thing can be worked without a
 * mouse or read out by a screen reader.
 */
export default function CourseField({
  id,
  course,
  onChange,
}: {
  id: string;
  course: Course;
  onChange: (course: Course) => void;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const listId = useId();
  const searchRef = useRef<HTMLInputElement>(null);

  const search = usePlaceSearch(term);
  const searching = search.isFetching || search.pending;

  const options = useMemo(
    () =>
      term.trim().length >= SEARCH.minQueryLength
        ? (search.data ?? []).map(toOption)
        : favourites,
    [term, search.data]
  );

  function choose(option: Option) {
    onChange(option.course);
    setOpen(false);
    setTerm("");
    setHighlighted(0);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (options.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((current) => (current + 1) % options.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((current) => (current - 1 + options.length) % options.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = options[highlighted];
      if (option) choose(option);
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setTerm("");
        setHighlighted(0);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          aria-haspopup="listbox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="flex min-w-0 items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">{course.name}</span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
        // Radix focuses the panel itself, which leaves the reader a keystroke
        // away from the only thing in it worth doing.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          searchRef.current?.focus();
        }}
      >
        <div className="relative border-b border-border p-2">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            ref={searchRef}
            role="combobox"
            aria-expanded={open}
            value={term}
            onChange={(event) => {
              setTerm(event.target.value);
              setHighlighted(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search for a course or a town"
            aria-label="Search for a course or a town"
            aria-controls={listId}
            aria-activedescendant={
              options[highlighted] ? `${listId}-${options[highlighted].key}` : undefined
            }
            className="border-0 pl-8 focus-visible:border-0"
          />
          {searching && (
            <LoaderCircle
              className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
              aria-hidden
            />
          )}
        </div>

        {term.trim().length < SEARCH.minQueryLength && (
          <p className="eyebrow px-3 pt-2">Favourites</p>
        )}

        {/* The options are described by the input above rather than focused
            themselves: aria-activedescendant is what keeps the caret in the
            search field while the arrow keys walk the list. */}
        <div
          id={listId}
          role="listbox"
          aria-label="Courses"
          className="max-h-72 overflow-y-auto p-1"
        >
          {options.map((option, index) => (
            // The list is driven from the input's key handler, and `option`
            // has no native tag outside a <select>.
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/prefer-tag-over-role
            <div
              key={option.key}
              id={`${listId}-${option.key}`}
              role="option"
              // Never focused itself — aria-activedescendant points the input
              // at it — but it has to be focusable for the role to be legal.
              tabIndex={-1}
              aria-selected={index === highlighted}
              onClick={() => choose(option)}
              onMouseEnter={() => setHighlighted(index)}
              className={cn(
                "flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                index === highlighted && "bg-surface-2"
              )}
            >
              {option.golf ? (
                <Flag className="h-4 w-4 shrink-0 text-accent" aria-hidden />
              ) : (
                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <span className="min-w-0">
                <span className="block truncate">{option.course.name}</span>
                {option.detail && (
                  <span className="block truncate text-xs text-muted-foreground">
                    {option.detail}
                  </span>
                )}
              </span>
            </div>
          ))}

          {options.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {searching
                ? "Looking…"
                : search.error
                  ? search.error.message
                  : `Nothing found for “${term.trim()}”.`}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
