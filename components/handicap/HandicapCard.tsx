"use client";

import { useId, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { HANDICAP, courseKey, type Course } from "@/lib/config";
import {
  courseHandicap,
  formatHandicap,
  scoreBand,
  teeFaults,
  type TeeSet,
} from "@/lib/handicap";
import type { useHandicap } from "@/hooks/useHandicap";
import ScoreBand from "@/components/handicap/ScoreBand";
import TeeSetForm from "@/components/handicap/TeeSetForm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * What you would have to go round in.
 *
 * Not a scorecard — nothing here records a round. It answers the question you
 * ask on the first tee, which is what a given number would take, and it sits
 * under the weather because the two are the same decision.
 *
 * Everything it needs is typed in and kept in this browser: an index, and the
 * ratings off the card for the tees you play. No service publishes course
 * ratings, so there is nothing to look them up from and nothing is guessed.
 *
 * Playing nine instead of eighteen is picking the other set of tees. Each set
 * carries its own length, so there is no switch to offer on a card that only
 * rates one of them.
 */
export default function HandicapCard({
  course,
  handicap,
}: {
  course: Course;
  handicap: ReturnType<typeof useHandicap>;
}) {
  const key = courseKey(course);
  const tees = handicap.teesFor(key);
  const titleId = useId();
  const indexId = useId();

  const [editing, setEditing] = useState<TeeSet | null>(null);
  const [adding, setAdding] = useState(false);

  const chosenId = handicap.chosenFor(key);
  const tee = tees.find((candidate) => candidate.id === chosenId) ?? tees[0] ?? null;

  // Numbers saved before they were checked, or off another card entirely. The
  // arithmetic would answer for them without complaint, which is the problem.
  const faults = tee === null ? [] : teeFaults(tee);
  const usable = tee !== null && faults.length === 0;

  const strokes =
    handicap.index === null || !usable ? null : courseHandicap(handicap.index, tee);

  const band = useMemo(
    () =>
      handicap.index === null || tee === null || teeFaults(tee).length > 0
        ? []
        : scoreBand(handicap.index, tee, HANDICAP.bandSpread),
    [handicap.index, tee]
  );

  return (
    <section aria-labelledby={titleId}>
      <Card>
        <CardHeader>
          <CardTitle id={titleId}>What you'd need to shoot</CardTitle>
          <CardDescription>
            Your handicap index and the ratings off the card at {course.name},
            turned into the score behind each differential. It doesn't record
            anything — it says what a round would be worth before you play it.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-32 space-y-1.5">
              <Label htmlFor={indexId}>Handicap index</Label>
              <Input
                id={indexId}
                inputMode="decimal"
                placeholder="12.4"
                className="tabular"
                value={handicap.index === null ? "" : formatHandicap(handicap.index)}
                onChange={(event) => {
                  const text = event.target.value.trim();
                  if (text === "") return handicap.setIndex(null);
                  // A plus handicap is written "+2.4" and worth minus two and a
                  // bit, so the sign on screen is the opposite of the arithmetic.
                  const value = text.startsWith("+")
                    ? -Number(text.slice(1))
                    : Number(text);
                  if (!Number.isNaN(value)) handicap.setIndex(value);
                }}
              />
            </div>

            {tee && (
              <div className="w-52 space-y-1.5">
                <Label htmlFor={`${titleId}-tees`}>Tees</Label>
                <Select
                  value={tee.id}
                  onValueChange={(next) => handicap.choose(key, next)}
                >
                  <SelectTrigger id={`${titleId}-tees`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tees.map((candidate) => (
                      <SelectItem key={candidate.id} value={candidate.id}>
                        {candidate.name}, {candidate.holes} holes
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="ml-auto flex gap-1">
              {tee && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditing(tee);
                    setAdding(false);
                  }}
                >
                  <Pencil aria-hidden />
                  Edit
                </Button>
              )}
              {tee && tees.length > 1 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handicap.removeTee(key, tee.id)}
                >
                  <Trash2 aria-hidden />
                  <span className="sr-only">
                    Remove {tee.name}, {tee.holes} holes
                  </span>
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setAdding(true);
                  setEditing(null);
                }}
              >
                <Plus aria-hidden />
                Tees
              </Button>
            </div>
          </div>

          {(adding || editing) && (
            <TeeSetForm
              key={editing?.id ?? "new"}
              tee={editing ?? undefined}
              onSave={(saved) => {
                handicap.saveTee(key, saved);
                setAdding(false);
                setEditing(null);
              }}
              onCancel={() => {
                setAdding(false);
                setEditing(null);
              }}
            />
          )}

          {tees.length === 0 && !adding && (
            <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              Add the tees you play at {course.name} — par, course rating and
              slope, off the card. Nobody publishes them, so they can't be
              looked up. Add the nine as its own set if you play one; a card
              rates it in its own right.
            </p>
          )}

          {tee && faults.length > 0 && !editing && (
            <p className="rounded-lg border border-dashed border-poor p-4 text-center text-sm text-muted-foreground">
              The numbers saved against the {tee.name} tees can't have come off
              one card — a course rating sits within a few strokes of par, and
              this one doesn't. Edit them and check against the card.
            </p>
          )}

          {tee && usable && handicap.index === null && (
            <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              Put your handicap index in and this fills up.
            </p>
          )}

          {tee && strokes !== null && (
            <>
              <p className="pretty text-sm">
                Off {formatHandicap(handicap.index ?? 0)} from the {tee.name}{" "}
                tees you get{" "}
                <span className="tabular font-semibold text-accent">
                  {formatHandicap(strokes, 0)}
                </span>{" "}
                {Math.abs(strokes) === 1 ? "shot" : "shots"} over {tee.holes}{" "}
                holes, so playing to your handicap is{" "}
                <span className="tabular font-semibold">
                  {tee.par + strokes}
                </span>
                .
              </p>

              <ScoreBand rows={band} />

              <p className="pretty text-xs text-muted-foreground">
                {tee.holes === 9 &&
                  "A nine is made up to eighteen holes with the differential a player of your index is expected to return over the nine you didn't play. "}
                Scores here are gross, before the net double bogey cap a real
                card applies, and the Playing Conditions Calculation is taken as
                nought — it's worked out from the day's scores afterwards, and a
                rough day is exactly when it moves. What a round would do to your
                index needs your last twenty, which this doesn't have.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
