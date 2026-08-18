import type { Tone } from "@/lib/scoring";

/**
 * How each tone is drawn.
 *
 * Spelled out rather than built up from a template, because Tailwind can only
 * generate a class it can read in the source. `text-${tone}` compiles to
 * nothing at all.
 */
export const TONE: Record<Tone, { text: string; fill: string; stroke: string; soft: string }> = {
  good: {
    text: "text-good",
    fill: "bg-good",
    stroke: "stroke-good",
    soft: "border-good/30 bg-good/10 text-good",
  },
  fair: {
    text: "text-fair",
    fill: "bg-fair",
    stroke: "stroke-fair",
    soft: "border-fair/30 bg-fair/10 text-fair",
  },
  poor: {
    text: "text-poor",
    fill: "bg-poor",
    stroke: "stroke-poor",
    soft: "border-poor/30 bg-poor/10 text-poor",
  },
};
