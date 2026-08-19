"use client";

import { useId, useState } from "react";

import { parRange, teeFaults, type Holes, type TeeFault, type TeeSet } from "@/lib/handicap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/ui/segmented-control";

/** Blank rather than plausible: a rating nobody typed is a rating nobody can trust. */
const EMPTY = { name: "", par: "", courseRating: "", slopeRating: "" };

type Fields = typeof EMPTY;

/** What a card of this length tends to say, shown as a hint and never as a value. */
const PLACEHOLDERS: Record<Holes, Fields> = {
  18: { name: "White", par: "72", courseRating: "72.6", slopeRating: "125" },
  9: { name: "White (front nine)", par: "36", courseRating: "36.1", slopeRating: "122" },
};

function Field({
  id,
  label,
  problem,
  ...props
}: { id: string; label: string; problem?: string } & React.ComponentProps<
  typeof Input
>) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        aria-invalid={problem ? true : undefined}
        aria-describedby={problem ? `${id}-problem` : undefined}
        className={problem ? "border-poor" : undefined}
        {...props}
      />
      {/* Said at the field rather than in a summary: the number that is wrong
          is the thing you have to look at on the card again. */}
      {problem && (
        <p id={`${id}-problem`} className="text-xs text-poor">
          {problem}
        </p>
      )}
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
 * One card, one length. A nine is rated in its own right rather than being
 * half an eighteen, so it is added as its own set of tees — which is also the
 * only way to describe a course that has nine holes and nothing else.
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
  const [holes, setHoles] = useState<Holes>(tee?.holes ?? 18);
  const [fields, setFields] = useState<Fields>(
    tee
      ? {
          name: tee.name,
          par: String(tee.par),
          courseRating: String(tee.courseRating),
          slopeRating: String(tee.slopeRating),
        }
      : EMPTY
  );
  const [faults, setFaults] = useState<TeeFault[]>([]);
  const ids = useId();
  const id = (name: string) => `${ids}-${name}`;
  const hint = PLACEHOLDERS[holes];
  const [lowPar, highPar] = parRange(holes);

  const problem = (field: TeeFault, message: string) =>
    faults.includes(field) ? message : undefined;

  const set = (name: keyof Fields) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setFields((current) => ({ ...current, [name]: event.target.value }));

  function submit(event: React.FormEvent) {
    event.preventDefault();

    const par = Number(fields.par);
    const courseRating = Number(fields.courseRating);
    const slopeRating = Number(fields.slopeRating);
    if (![par, courseRating, slopeRating].every(Number.isFinite)) return;

    const candidate = {
      id: tee?.id ?? crypto.randomUUID(),
      name: fields.name.trim() || "Tees",
      holes,
      par,
      courseRating,
      slopeRating,
    };

    // Refused here rather than saved and shown: every figure on the card below
    // is worked out from these three, and a wrong one reads exactly like a
    // right one once it has been turned into a score.
    const found = teeFaults(candidate);
    setFaults(found);
    if (found.length > 0) return;

    onSave(candidate);
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-border bg-surface-2/40 p-3">
      {/* First, because it says what the three numbers under it are ratings of. */}
      <SegmentedControl
        label="Holes these tees are rated over"
        value={String(holes)}
        onValueChange={(next) => {
          setHoles(Number(next) as Holes);
          setFaults([]);
        }}
        className="mb-3"
      >
        <SegmentedControlItem value="18" className="h-8 px-3 text-xs">
          18 holes
        </SegmentedControlItem>
        <SegmentedControlItem value="9" className="h-8 px-3 text-xs">
          9 holes
        </SegmentedControlItem>
      </SegmentedControl>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field
          id={id("name")}
          label="Tees"
          placeholder={hint.name}
          value={fields.name}
          onChange={set("name")}
        />
        <Field
          id={id("par")}
          label="Par"
          inputMode="numeric"
          placeholder={hint.par}
          value={fields.par}
          onChange={set("par")}
          problem={problem(
            "par",
            `A ${holes === 9 ? "nine" : "round"} is a par of ${lowPar} to ${highPar}.`
          )}
          required
        />
        <Field
          id={id("cr")}
          label="Course rating"
          inputMode="decimal"
          placeholder={hint.courseRating}
          value={fields.courseRating}
          onChange={set("courseRating")}
          problem={problem(
            "courseRating",
            holes === 9
              ? "A rating sits within a few strokes of par — is this the eighteen-hole one?"
              : "A rating sits within a few strokes of par."
          )}
          required
        />
        <Field
          id={id("slope")}
          label="Slope rating"
          inputMode="numeric"
          placeholder={hint.slopeRating}
          value={fields.slopeRating}
          onChange={set("slopeRating")}
          problem={problem("slopeRating", "Slope runs from 55 to 155.")}
          required
        />
      </div>

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
