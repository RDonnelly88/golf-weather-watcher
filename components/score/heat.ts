import { heatBand, type HeatBand } from "@/lib/scoring";

/**
 * How each step of the score ramp is drawn.
 *
 * Spelled out rather than built from a template, because Tailwind can only
 * generate a class it can read in the source. `bg-score-${band}` compiles to
 * nothing at all.
 */
const FILLS: Record<HeatBand, string> = {
  1: "bg-score-1",
  2: "bg-score-2",
  3: "bg-score-3",
  4: "bg-score-4",
  5: "bg-score-5",
};

export function heatFill(score: number): string {
  return FILLS[heatBand(score)];
}

/** The ramp in order, for the legend. */
export const HEAT_STEPS: string[] = [1, 2, 3, 4, 5].map(
  (band) => FILLS[band as HeatBand]
);
