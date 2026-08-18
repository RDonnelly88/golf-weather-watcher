"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { WEIGHTS, toneFor, type FactorScore, type RoundScore } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import Counter from "@/components/Counter";
import { TONE } from "@/components/score/tone";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";

/** The ring is drawn on a 200-square, so the path around it is 2πr of 90. */
const RADIUS = 90;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** The four that are weighted against each other. Daylight multiplies them. */
type WeightedFactor = FactorScore & { key: keyof typeof WEIGHTS };

function isWeighted(factor: FactorScore): factor is WeightedFactor {
  return factor.key in WEIGHTS;
}

export default function OverallScore({ round }: { round: RoundScore }) {
  const [open, setOpen] = useState(false);
  const tone = TONE[toneFor(round.overall)];

  const daylight = round.factors.find((factor) => factor.key === "daylight");
  const weighted = round.factors.filter(isWeighted);

  return (
    <Card>
      <CardContent className="flex h-full flex-col items-center justify-center p-6">
        <div className="relative">
          {/* Decorative: the figure and its scale are written in the middle. */}
          <svg viewBox="0 0 200 200" className="h-44 w-44 -rotate-90" aria-hidden>
            <circle
              cx="100"
              cy="100"
              r={RADIUS}
              fill="none"
              strokeWidth="10"
              className="stroke-surface-2"
            />
            <circle
              cx="100"
              cy="100"
              r={RADIUS}
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - round.overall / 100)}
              className={cn(
                "transition-[stroke-dashoffset] duration-700 ease-out",
                tone.stroke
              )}
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("tabular text-5xl font-bold leading-none", tone.text)}>
              <Counter value={round.overall} />
            </span>
            <span className="eyebrow mt-1">out of 100</span>
          </div>
        </div>

        <p className="balance mt-4 text-center text-base font-medium">{round.verdict}</p>

        <Collapsible open={open} onOpenChange={setOpen} className="mt-4 w-full">
          <CollapsibleTrigger className="focus-ring mx-auto flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
            How this was worked out
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
              aria-hidden
            />
          </CollapsibleTrigger>

          <CollapsibleContent>
            <dl className="mt-3 space-y-1.5 rounded-lg border border-border bg-surface-2/50 p-3 text-sm">
              {weighted.map((factor) => (
                <div key={factor.key} className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted-foreground">
                    {factor.label}
                    <span className="ml-1.5 text-xs">
                      × {Math.round(WEIGHTS[factor.key] * 100)}%
                    </span>
                  </dt>
                  <dd className="tabular font-medium">
                    {Math.round(factor.score * WEIGHTS[factor.key])}
                  </dd>
                </div>
              ))}

              <div className="flex items-baseline justify-between gap-3 border-t border-border pt-1.5">
                <dt className="font-medium">Weather</dt>
                <dd className="tabular font-semibold">{round.base}</dd>
              </div>

              {daylight && (
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted-foreground">
                    Daylight
                    <span className="ml-1.5 text-xs">{daylight.reading}</span>
                  </dt>
                  <dd className="tabular font-medium">
                    × {(daylight.score / 100).toFixed(2)}
                  </dd>
                </div>
              )}

              <div className="flex items-baseline justify-between gap-3 border-t border-border pt-1.5">
                <dt className="font-medium">Golf score</dt>
                <dd className={cn("tabular font-bold", tone.text)}>{round.overall}</dd>
              </div>
            </dl>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
