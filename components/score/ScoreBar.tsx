import { toneFor } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import { TONE } from "@/components/score/tone";

/**
 * A score out of a hundred, as a length.
 *
 * Hidden from screen readers: every bar in the app sits beside the same figure
 * written out, and hearing "eighty-five" twice is worse than not seeing it.
 */
export function ScoreBar({ score, className }: { score: number; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-2", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500 ease-out",
          TONE[toneFor(score)].fill
        )}
        style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
      />
    </div>
  );
}
