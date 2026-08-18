/**
 * The handicap arithmetic, pure and tested.
 *
 * This is not a scorecard. Nothing here records what you shot — it answers the
 * question you ask standing on the first tee, which is what you would have to
 * go round in for a given number to land on your record.
 *
 * The World Handicap System is the model, and the two figures it turns on are
 * the Course Handicap (how many strokes this course gives you) and the Score
 * Differential (what a round is worth once the course's difficulty is taken
 * out of it).
 */

/** The neutral slope. A course of average difficulty rates 113. */
const NEUTRAL_SLOPE = 113;

/**
 * One set of tees, as printed on the card.
 *
 * A course is rated separately from every set of tees and for nine holes as
 * well as eighteen, which is why this is a list per course rather than three
 * numbers on it. The nine-hole ratings are optional because plenty of cards
 * only carry the eighteen.
 */
export interface TeeSet {
  id: string;
  /** What the card calls them: "White", "Yellow", "Championship". */
  name: string;
  par: number;
  courseRating: number;
  slopeRating: number;
  nine?: NineRatings;
}

interface NineRatings {
  par: number;
  courseRating: number;
  slopeRating: number;
}

export type Holes = 9 | 18;

/**
 * How many strokes this course gives you.
 *
 *   Course Handicap = Index × (Slope ÷ 113) + (Course Rating − Par)
 *
 * The last term is what makes a course whose rating sits above its par give
 * strokes away before anybody has hit a ball. Over nine, the index is halved
 * and the nine-hole ratings are used.
 *
 * Rounded to a whole number of strokes, which is what you actually receive.
 */
export function courseHandicap(
  index: number,
  tee: TeeSet,
  holes: Holes
): number | null {
  if (holes === 18) {
    return Math.round(
      index * (tee.slopeRating / NEUTRAL_SLOPE) + (tee.courseRating - tee.par)
    );
  }

  if (!tee.nine) return null;

  return Math.round(
    (index / 2) * (tee.nine.slopeRating / NEUTRAL_SLOPE) +
      (tee.nine.courseRating - tee.nine.par)
  );
}

/**
 * What a nine you did not play is expected to be worth.
 *
 * A nine-hole round no longer waits to be paired with another one: it is made
 * up to eighteen holes at once, by adding the differential a player of your
 * index would be expected to return over the missing nine. It is a neutral
 * figure for an index rather than anything about you, so a good nine makes a
 * good eighteen-hole differential and an ordinary one makes an ordinary one.
 */
export function expectedNineDifferential(index: number): number {
  return (index * 73 + 162) / 140;
}

/** Differentials are carried to one decimal place, and no further. */
function toTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * What a round is worth once the course is taken out of it.
 *
 *   Score Differential = (Adjusted Gross Score − Course Rating) × 113 ÷ Slope
 *
 * A nine-hole score is turned into an eighteen-hole differential by adding the
 * expected differential for the nine not played, because that is the figure
 * that reaches your record.
 *
 * The Playing Conditions Calculation is left out. It is worked out from the
 * day's scores after the fact and can move a differential by up to three
 * strokes, so it cannot be known in advance — which is worth remembering on a
 * page that exists to tell you the weather.
 */
export function scoreDifferential(
  grossScore: number,
  tee: TeeSet,
  holes: Holes,
  index: number
): number | null {
  if (holes === 18) {
    return toTenth(
      ((grossScore - tee.courseRating) * NEUTRAL_SLOPE) / tee.slopeRating
    );
  }

  if (!tee.nine) return null;

  const played =
    ((grossScore - tee.nine.courseRating) * NEUTRAL_SLOPE) /
    tee.nine.slopeRating;

  return toTenth(played + expectedNineDifferential(index));
}

/**
 * The score that would return a given differential.
 *
 * The inverse of the above, and the question actually being asked: not "what
 * is this round worth" but "what do I have to go round in".
 */
export function scoreFor(
  differential: number,
  tee: TeeSet,
  holes: Holes,
  index: number
): number | null {
  if (holes === 18) {
    return Math.round(
      tee.courseRating + (differential * tee.slopeRating) / NEUTRAL_SLOPE
    );
  }

  if (!tee.nine) return null;

  const played = differential - expectedNineDifferential(index);
  return Math.round(
    tee.nine.courseRating + (played * tee.nine.slopeRating) / NEUTRAL_SLOPE
  );
}

/** The par of whichever card is being played. */
export function parFor(tee: TeeSet, holes: Holes): number | null {
  return holes === 18 ? tee.par : (tee.nine?.par ?? null);
}

export interface BandRow {
  /** Gross score, before the net double bogey cap that a real card would apply. */
  score: number;
  /** Strokes against par, for the row's label: −1, level, +4. */
  toPar: number;
  differential: number;
  /** How the differential compares with the index it would land against. */
  against: number;
  /** Level with the course handicap: the round you are expected to play. */
  expected: boolean;
}

/**
 * A run of scores either side of playing to your handicap.
 *
 * Built as a band rather than a box to type a score into, because the question
 * is rarely "what was that worth" and usually "what would I need". The row
 * marked `expected` is par plus your course handicap — the round that means
 * you played to it.
 */
export function scoreBand(
  index: number,
  tee: TeeSet,
  holes: Holes,
  spread: number
): BandRow[] {
  const handicap = courseHandicap(index, tee, holes);
  const par = parFor(tee, holes);
  if (handicap === null || par === null) return [];

  const centre = par + handicap;

  return Array.from({ length: spread * 2 + 1 }, (_, i) => {
    const score = centre - spread + i;
    const differential = scoreDifferential(score, tee, holes, index) ?? 0;

    return {
      score,
      toPar: score - par,
      differential,
      against: toTenth(differential - index),
      expected: score === centre,
    };
  });
}

/**
 * How golf writes a handicap.
 *
 * A player better than scratch is a plus handicap, written "+2.4" and worth
 * minus two and a bit strokes — the sign on the page is the opposite of the
 * sign in the arithmetic, which is exactly the sort of thing to do once, here,
 * rather than at each place that shows a number.
 */
export function formatHandicap(value: number, places = 1): string {
  if (value < 0) return `+${Math.abs(value).toFixed(places)}`;
  return value.toFixed(places);
}

/** A score against par, as a card would write it. */
export function formatToPar(toPar: number): string {
  if (toPar === 0) return "level";
  return toPar > 0 ? `+${toPar}` : String(toPar);
}
