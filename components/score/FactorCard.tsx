"use client";

import { useState } from "react";
import {
  ChevronDown,
  Cloud,
  CloudRain,
  Sunrise,
  Thermometer,
  Wind,
  type LucideIcon,
} from "lucide-react";

import { WEIGHTS, toneFor, type FactorKey, type FactorScore } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import { ScoreBar } from "@/components/score/ScoreBar";
import { TONE } from "@/components/score/tone";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";

const ICONS: Record<FactorKey, LucideIcon> = {
  rain: CloudRain,
  temperature: Thermometer,
  wind: Wind,
  cloud: Cloud,
  daylight: Sunrise,
};

/** What each factor is worth, said in words rather than as a bare number. */
const percent = (weight: number) => `${Math.round(weight * 100)}% of the score`;

const SHARE: Record<FactorKey, string> = {
  rain: percent(WEIGHTS.rain),
  temperature: percent(WEIGHTS.temperature),
  wind: percent(WEIGHTS.wind),
  cloud: percent(WEIGHTS.cloud),
  daylight: "Multiplies the rest",
};

/**
 * One of the five things the round is judged on.
 *
 * The card shows its own working: every band of the table it was scored
 * against, with the one the reading fell into marked. The alternative is a
 * number with nothing behind it, and this app's entire opinion is arithmetic.
 */
export default function FactorCard({
  factor,
  className,
}: {
  factor: FactorScore;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const Icon = ICONS[factor.key];
  const tone = TONE[toneFor(factor.score)];

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Icon className={cn("h-4 w-4 shrink-0", tone.text)} aria-hidden />
              <h3 className="font-medium">{factor.label}</h3>
            </div>
            <p className="tabular mt-0.5 truncate text-sm text-muted-foreground">
              {factor.reading}
            </p>
          </div>

          <p className={cn("tabular shrink-0 text-2xl font-bold leading-none", tone.text)}>
            {factor.score}
          </p>
        </div>

        <ScoreBar score={factor.score} className="mt-3" />

        {factor.note && (
          <p className="mt-2 text-xs text-muted-foreground">{factor.note}</p>
        )}

        <Collapsible open={open} onOpenChange={setOpen} className="mt-2">
          <CollapsibleTrigger className="focus-ring flex w-full items-center justify-between rounded-md py-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
            <span>{SHARE[factor.key]}</span>
            <span className="flex items-center gap-1">
              Bands
              <ChevronDown
                className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
                aria-hidden
              />
            </span>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <ul className="mt-2 space-y-1">
              {factor.bands.map((band) => (
                <li
                  key={band.label}
                  className={cn(
                    "flex items-center justify-between rounded-md border px-2 py-1 text-xs",
                    band.active
                      ? tone.soft
                      : "border-transparent bg-surface-2/60 text-muted-foreground"
                  )}
                >
                  <span>{band.label}</span>
                  <span className="tabular font-medium">{band.score}</span>
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
