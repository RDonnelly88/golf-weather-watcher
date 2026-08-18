"use client";

import { useId, useState } from "react";

import type { TeeSet } from "@/lib/handicap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Blank rather than plausible: a rating nobody typed is a rating nobody can trust. */
const EMPTY = {
  name: "",
  par: "",
  courseRating: "",
  slopeRating: "",
  ninePar: "",
  nineCourseRating: "",
  nineSlopeRating: "",
};

type Fields = typeof EMPTY;

function fieldsFrom(tee: TeeSet): Fields {
  return {
    name: tee.name,
    par: String(tee.par),
    courseRating: String(tee.courseRating),
    slopeRating: String(tee.slopeRating),
    ninePar: tee.nine ? String(tee.nine.par) : "",
    nineCourseRating: tee.nine ? String(tee.nine.courseRating) : "",
    nineSlopeRating: tee.nine ? String(tee.nine.slopeRating) : "",
  };
}

function Field({
  id,
  label,
  hint,
  ...props
}: { id: string; label: string; hint?: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} {...props} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/**
 * The numbers off the card.
 *
 * They are typed in because there is no free service that publishes course
 * ratings, and nothing here is pre-filled with a guess: a made-up rating looks
 * exactly like a real one and would quietly wrong every figure below it.
 *
 * The nine-hole ratings are their own three numbers rather than half the
 * eighteen. A nine is rated in its own right, and halving an eighteen-hole
 * rating is not the same thing.
 */
export default function TeeSetForm({
  tee,
  onSave,
  onCancel,
}: {
  /** Editing an existing set, or adding one when absent. */
  tee?: TeeSet;
  onSave: (tee: TeeSet) => void;
  onCancel: () => void;
}) {
  const [fields, setFields] = useState<Fields>(tee ? fieldsFrom(tee) : EMPTY);
  const ids = useId();
  const id = (name: string) => `${ids}-${name}`;

  const set = (name: keyof Fields) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setFields((current) => ({ ...current, [name]: event.target.value }));

  const number = (value: string) => (value.trim() === "" ? null : Number(value));

  function submit(event: React.FormEvent) {
    event.preventDefault();

    const par = number(fields.par);
    const courseRating = number(fields.courseRating);
    const slopeRating = number(fields.slopeRating);
    if (par === null || courseRating === null || slopeRating === null) return;

    const ninePar = number(fields.ninePar);
    const nineCourseRating = number(fields.nineCourseRating);
    const nineSlopeRating = number(fields.nineSlopeRating);
    // All three or none: two of them is a nine that cannot be scored.
    const nine =
      ninePar !== null && nineCourseRating !== null && nineSlopeRating !== null
        ? { par: ninePar, courseRating: nineCourseRating, slopeRating: nineSlopeRating }
        : undefined;

    onSave({
      id: tee?.id ?? crypto.randomUUID(),
      name: fields.name.trim() || "Tees",
      par,
      courseRating,
      slopeRating,
      nine,
    });
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-border bg-surface-2/40 p-3">
      {/* Grouped and named, because "Par" appears twice in this form and a
          label heard on its own has to say which one it is. */}
      <fieldset className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <legend className="sr-only">The eighteen</legend>
        <Field
          id={id("name")}
          label="Tees"
          placeholder="White"
          value={fields.name}
          onChange={set("name")}
        />
        <Field
          id={id("par")}
          label="Par"
          inputMode="numeric"
          placeholder="72"
          value={fields.par}
          onChange={set("par")}
          required
        />
        <Field
          id={id("cr")}
          label="Course rating"
          inputMode="decimal"
          placeholder="72.6"
          value={fields.courseRating}
          onChange={set("courseRating")}
          required
        />
        <Field
          id={id("slope")}
          label="Slope rating"
          inputMode="numeric"
          placeholder="125"
          value={fields.slopeRating}
          onChange={set("slopeRating")}
          required
        />
      </fieldset>

      <fieldset className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <legend className="eyebrow mb-1">The nine, if the card rates one</legend>
        <Field
          id={id("nine-par")}
          label="Par over nine"
          inputMode="numeric"
          placeholder="36"
          value={fields.ninePar}
          onChange={set("ninePar")}
        />
        <Field
          id={id("nine-cr")}
          label="Course rating over nine"
          inputMode="decimal"
          placeholder="36.1"
          value={fields.nineCourseRating}
          onChange={set("nineCourseRating")}
        />
        <Field
          id={id("nine-slope")}
          label="Slope rating over nine"
          inputMode="numeric"
          placeholder="122"
          value={fields.nineSlopeRating}
          onChange={set("nineSlopeRating")}
        />
      </fieldset>

      <div className="mt-4 flex gap-2">
        <Button type="submit" size="sm">
          {tee ? "Save these tees" : "Add these tees"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
