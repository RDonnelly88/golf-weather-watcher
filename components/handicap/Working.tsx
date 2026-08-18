"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import {
  NEUTRAL_SLOPE,
  courseHandicap,
  differentialParts,
  formatHandicap,
  type TeeSet,
} from "@/lib/handicap";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

/** A line of arithmetic, with the sum it comes to set apart from it. */
function Line({ children, value }: { children: React.ReactNode; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-border/60 py-1.5 last:border-b-0">
      <span className="tabular text-xs text-muted-foreground">{children}</span>
      <span className="tabular text-sm font-semibold">{value}</span>
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return <p className="eyebrow mt-3 mb-1 first:mt-0">{children}</p>;
}

/**
 * Where the numbers above came from, in the reader's own figures.
 *
 * The band is a table of answers, and a table of answers with nothing behind
 * it is a thing you either believe or don't. This shows the arithmetic with
 * the ratings off this card and this index substituted in, so the working can
 * be checked rather than trusted — the same bargain the factor cards make when
 * they show the band table they were scored against.
 *
 * Every figure here is handed over by the model. Nothing on this page works
 * anything out for itself, because an explanation that does its own arithmetic
 * is how the explanation ends up describing a number the app stopped
 * producing.
 */
export default function Working({ tee, index }: { tee: TeeSet; index: number }) {
  const [open, setOpen] = useState(false);

  const strokes = courseHandicap(index, tee);
  const level = tee.par + strokes;
  const parts = differentialParts(level, tee, index);
  const nine = tee.holes === 9;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="focus-ring flex w-full items-center justify-between rounded-md py-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
        <span>How this is worked out</span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-2 rounded-lg border border-border bg-surface-2/40 p-3">
          <Heading>The shots you get</Heading>
          <p className="pretty mb-1 text-xs text-muted-foreground">
            Your index measured against this card: how it slopes, and how its
            rating sits against its par.
            {nine && " Over nine holes the index is halved, because an index describes eighteen."}
          </p>
          <Line
            value={`${formatHandicap(strokes, 0)} shots`}
          >
            {nine ? `(${formatHandicap(index)} ÷ 2)` : formatHandicap(index)} × (
            {tee.slopeRating} ÷ {NEUTRAL_SLOPE}) + ({tee.courseRating} −{" "}
            {tee.par})
          </Line>

          <Heading>What a round is worth</Heading>
          <p className="pretty mb-1 text-xs text-muted-foreground">
            The course taken back out of the score, so a round here can be
            compared with a round anywhere. Taking {level} — the score that
            means you played to your handicap — as the example.
          </p>
          <Line value={parts.played.toFixed(2)}>
            ({level} − {tee.courseRating}) × {NEUTRAL_SLOPE} ÷ {tee.slopeRating}
          </Line>

          {nine && (
            <>
              <Line value={`+ ${parts.expected.toFixed(2)}`}>
                the nine you didn&apos;t play
              </Line>
              <Line value={parts.total.toFixed(1)}>
                {(parts.played + parts.expected).toFixed(2)}, carried to one
                decimal place
              </Line>

              <Heading>The nine you didn&apos;t play</Heading>
              <p className="pretty text-xs text-muted-foreground">
                A nine no longer waits to be paired with another one. It is made
                up to eighteen holes as soon as it is posted, by adding the
                differential a player off {formatHandicap(index)} is expected to
                return over the nine missing from it. That figure comes from
                your index alone — not from this course, and not from how you
                went round — so a good nine still makes a good differential.
              </p>
              <p className="pretty mt-2 text-xs text-muted-foreground">
                It does mean half of every nine-hole differential is an
                assumption rather than something you did. A very good nine is
                pulled back toward the middle by the ordinary half bolted onto
                it, which is worth knowing before you go out to chase a number.
              </p>
            </>
          )}

          {!nine && (
            <Line value={parts.total.toFixed(1)}>carried to one decimal place</Line>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
