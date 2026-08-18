"use client";

import { formatToPar, type BandRow } from "@/lib/handicap";
import { cn } from "@/lib/utils";

/**
 * What each score round here would be worth.
 *
 * A band rather than a box to type into: the question is what you would have
 * to go round in, so the answers are laid out and you find yours. The row
 * level with your course handicap is marked, because it is the one everything
 * else is read against.
 *
 * The last column is the only one that needs a moment: it is the differential
 * against the index it would land on, so a minus is a round better than you
 * are, and it is coloured for that rather than for being a low number.
 */
export default function ScoreBand({ rows }: { rows: BandRow[] }) {
  return (
    <table className="w-full table-fixed text-sm">
      <caption className="sr-only">
        Scores either side of playing to your course handicap, and what each one
        would be worth
      </caption>
      {/* Four columns will not carry four full words across a phone, so the
          two long ones shorten rather than wrap into each other. */}
      <thead className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        <tr className="border-b border-border">
          <th scope="col" className="w-[38%] py-1.5 text-left font-medium sm:w-[45%]">
            Score
          </th>
          <th scope="col" className="w-[16%] py-1.5 text-right font-medium">
            <span className="sm:hidden">Par</span>
            <span className="hidden sm:inline">To par</span>
          </th>
          <th scope="col" className="w-[20%] py-1.5 text-right font-medium">
            <span className="sm:hidden">Diff</span>
            <span className="hidden sm:inline">Differential</span>
          </th>
          <th scope="col" className="w-[26%] py-1.5 text-right font-medium">
            <span className="sm:hidden">vs index</span>
            <span className="hidden sm:inline">On your index</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.score}
            className={cn(
              "border-b border-border/60 last:border-b-0",
              row.expected && "bg-accent/10"
            )}
          >
            <th
              scope="row"
              className={cn(
                "tabular py-1.5 text-left font-semibold",
                row.expected && "text-accent"
              )}
            >
              {row.score}
              {row.expected && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  playing to your handicap
                </span>
              )}
            </th>
            <td className="tabular py-1.5 text-right text-muted-foreground">
              {formatToPar(row.toPar)}
            </td>
            <td className="tabular py-1.5 text-right font-medium">
              {row.differential.toFixed(1)}
            </td>
            <td
              className={cn(
                "tabular py-1.5 text-right",
                row.against < 0 ? "text-good" : "text-muted-foreground"
              )}
            >
              {row.against === 0
                ? "level"
                : `${Math.abs(row.against).toFixed(1)} ${row.against < 0 ? "better" : "worse"}`}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
