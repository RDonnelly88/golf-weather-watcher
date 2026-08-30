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
export const NEUTRAL_SLOPE = 113;

export type Holes = 9 | 18;

/**
 * One set of tees over one number of holes, as printed on the card.
 *
 * A course is rated separately from every set of tees and separately over nine
 * holes and eighteen, so a nine is its own entry rather than three extra
 * numbers hanging off an eighteen. That is what lets a nine-hole course be
 * described at all, and it makes playing nine instead of eighteen a matter of
 * picking the other card rather than a switch that some tees can't honour.
 */
export interface TeeSet {
  id: string;
  /** What the card calls them: "White", "Yellow", "Championship". */
  name: string;
  holes: Holes;
  par: number;
  courseRating: number;
  slopeRating: number;
}

/**
 * How many strokes this course gives you.
 *
 *   Course Handicap = Index × (Slope ÷ 113) + (Course Rating − Par)
 *
 * The last term is what makes a course whose rating sits above its par give
 * strokes away before anybody has hit a ball. Over nine the index is halved,
 * because an index describes eighteen holes.
 *
 * Rounded to a whole number of strokes, which is what you actually receive.
 */
export function courseHandicap(index: number, tee: TeeSet): number {
  const forHoles = tee.holes === 9 ? index / 2 : index;

  return Math.round(
    forHoles * (tee.slopeRating / NEUTRAL_SLOPE) + (tee.courseRating - tee.par)
  );
}

/**
 * The three numbers behind the expected differential.
 *
 * Named so that a card explaining where the figure came from can show the
 * arithmetic without keeping its own copy of it.
 */
export const EXPECTED_NINE = { perIndex: 73, offset: 162, divisor: 140 } as const;

/**
 * What a nine you did not play is expected to be worth.
 *
 * A nine-hole score is made up to eighteen holes as it is posted, by adding
 * the differential a player of your index is expected to return over the nine
 * missing from it. It is a neutral figure for an index rather than anything
 * about you, so a good nine makes a good eighteen-hole differential and an
 * ordinary one makes an ordinary one.
 */
export function expectedNineDifferential(index: number): number {
  return (
    (index * EXPECTED_NINE.perIndex + EXPECTED_NINE.offset) / EXPECTED_NINE.divisor
  );
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
  index: number
): number {
  return differentialParts(grossScore, tee, index).total;
}

/** A differential and the two halves it was made of. */
export interface DifferentialParts {
  /** The holes actually walked, with the course taken out of them. */
  played: number;
  /** The nine that wasn't, expected from the index alone. Nought over eighteen. */
  expected: number;
  /** The differential itself, carried to one decimal place. */
  total: number;
}

/**
 * The same arithmetic as above, kept apart.
 *
 * A card that explains where a nine-hole differential came from has to show
 * the two halves, and the only safe way to show them is to be handed them —
 * a component that works out the split itself is a second copy of this waiting
 * to disagree with the first.
 *
 * The halves come out unrounded, because the system rounds once at the end and
 * rounding them first moves a quarter of all nine-hole differentials by a
 * tenth. Anything showing them has to show enough decimals to add up.
 */
export function differentialParts(
  grossScore: number,
  tee: TeeSet,
  index: number
): DifferentialParts {
  const played = ((grossScore - tee.courseRating) * NEUTRAL_SLOPE) / tee.slopeRating;
  const expected = tee.holes === 9 ? expectedNineDifferential(index) : 0;

  return { played, expected, total: toTenth(played + expected) };
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
  index: number
): number {
  const played =
    tee.holes === 9 ? differential - expectedNineDifferential(index) : differential;

  return Math.round(
    tee.courseRating + (played * tee.slopeRating) / NEUTRAL_SLOPE
  );
}

/**
 * What a card can plausibly say, so that a number from the wrong one is caught
 * rather than believed.
 *
 * These are not the arithmetic — the formulae above will take any figures they
 * are given and answer confidently. They are the sanity check the formulae
 * can't do for themselves: a rating twenty strokes off its par produces a
 * course handicap that looks like a typing mistake and reads like a fact.
 */
const PAR: Record<Holes, [number, number]> = {
  9: [27, 40],
  18: [54, 80],
};

/** The range the World Handicap System defines a slope over. */
const SLOPE: [number, number] = [55, 155];

/**
 * How far a course rating can sit from par.
 *
 * It is the score a scratch player is expected to return, so it tracks par
 * closely — a couple either way is normal and five is a hard course. Eight is
 * loose enough not to refuse a real card and tight enough to catch an
 * eighteen-hole rating typed against a nine.
 */
const MAX_DRIFT = 8;

/** The field on the card that can't be right, if any of them can't. */
export type TeeFault = "par" | "courseRating" | "slopeRating";

function outside(value: number, [low, high]: [number, number]): boolean {
  return !(value >= low && value <= high);
}

/** Which of a set of tees' numbers could not have come off the card. */
export function teeFaults(tee: TeeSet): TeeFault[] {
  const faults: TeeFault[] = [];

  if (outside(tee.par, PAR[tee.holes])) faults.push("par");
  if (outside(tee.slopeRating, SLOPE)) faults.push("slopeRating");
  if (Math.abs(tee.courseRating - tee.par) > MAX_DRIFT) faults.push("courseRating");

  return faults;
}

/** The bounds themselves, for a form that has to say what it will accept. */
export function parRange(holes: Holes): [number, number] {
  return PAR[holes];
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
  spread: number
): BandRow[] {
  const centre = tee.par + courseHandicap(index, tee);

  return Array.from({ length: spread * 2 + 1 }, (_, i) => {
    const score = centre - spread + i;
    const differential = scoreDifferential(score, tee, index);

    return {
      score,
      toPar: score - tee.par,
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

/**
 * What a handicap index can be: ten better than scratch, up to fifty-four.
 *
 * Here rather than in the storage schema because it is a fact about the
 * system, and the field that reads one and the store that keeps one should not
 * be able to disagree about it.
 */
export const INDEX_RANGE: [number, number] = [-10, 54];

/**
 * A typed handicap, read the way golf writes one.
 *
 * Three answers, because a field being typed into has three states: a number
 * for text that is a handicap, null for a field that has been emptied, and
 * undefined for text that is not a handicap *yet* — a lone "+", a trailing
 * point, a figure still being extended past the end of the range. Undefined
 * means leave what is on screen alone rather than reject it.
 */
export function parseHandicap(text: string): number | null | undefined {
  const trimmed = text.trim();
  if (trimmed === "") return null;

  // A plus handicap is written "+2.4" and is worth minus two and a bit. A
  // leading minus is not how anybody writes one, so it isn't read as one.
  const plus = trimmed.startsWith("+");
  const digits = plus ? trimmed.slice(1) : trimmed;
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(digits)) return undefined;

  const value = Number(digits);
  if (!Number.isFinite(value)) return undefined;

  // An index carries one decimal place, so that is what is kept: storing
  // 12.45 and drawing it as 12.5 is two numbers where there should be one.
  const rounded = Math.round((plus ? -value : value) * 10) / 10;
  // "+0" is scratch, not negative zero — which would otherwise reach storage.
  const signed = rounded === 0 ? 0 : rounded;
  const [low, high] = INDEX_RANGE;

  return signed >= low && signed <= high ? signed : undefined;
}

/** A score against par, as a card would write it. */
export function formatToPar(toPar: number): string {
  if (toPar === 0) return "level";
  return toPar > 0 ? `+${toPar}` : String(toPar);
}
