@AGENTS.md

# Working in this repo

Guidance for AI agents. The human-facing doc is the [README](README.md) — read
that for what the app is and how to run it.

## Before you finish

```bash
npm run check          # typecheck → lint → knip → unit tests
```

This must pass. Also run, when relevant:

| Changed | Run |
|---|---|
| Anything visual | `npm run e2e:shots`, then **look at the screenshots** |

Don't claim something works because it compiles. The build passing and the
feature working are different claims — the score cards rendered perfectly with
a hole in the grid where the fifth one should have been.

`typecheck` deliberately runs with `--incremental false`. A stale
`tsconfig.tsbuildinfo` reports success against a tree it last saw an hour ago.

## Non-negotiables

**Derive, never cache.** The score is computed from the forecast on every
render. Do not add a state variable, a field or a stored copy that holds a
score, a total or an average alongside the hours it came from. If two things
can disagree, eventually they will.

**One model, in one file.** `lib/scoring.ts` decides what a score is, and
nothing else does. A component that works out its own weighting, or a second
copy of a band table so a card can explain itself, is how the explanation comes
to describe a number the app no longer produces. The factors carry their own
band tables out with them for exactly this reason.

**Never fabricate weather.** If the model has no answer for a date, say so.
Standing in demo readings when the API returns nothing produces a page that
reads exactly like a real forecast, and there is no way for the reader to tell.

**The two services are called from the server.** Nominatim's terms ask for a
user agent naming the caller, which a browser cannot send, and both responses
are validated with zod in the route handler before anything renders them. A
component fetching a third-party API directly skips both.

**Times are local to the course and carry no offset.** `"2026-09-26T13:00"` is
one o'clock where you are teeing off. Never parse one into a `Date` and format
it back — that silently moves the round into whatever timezone the reader is
sitting in. Compare the strings, or use the helpers in `lib/forecast.ts`.

**A round can run past midnight.** Anything that walks the hours goes through
`roundHours()`, which knows that. Indexing into the API's arrays by hour does
not.

**Whether an hour has been and gone is a question about the clock at the
course.** A morning in Auckland is not over because it is evening in Fife. The
outlook carries the course's UTC offset for exactly this, and `courseTime()`
is the only thing that should answer it.

**Colour is never the only carrier of a score.** The heatmap paints an hour and
says nothing in the cell, so the accessible name spells the number out. Any new
thing drawn on the `--score-*` ramp owes the same.

## Architecture

One page, `app/page.tsx`, carrying `"use client"` and fetching through TanStack
Query against two route handlers in `app/api/`. There is no database, no auth
and no account — the only stored state is the round you last asked about, in
`localStorage`.

**Nothing is fetched until the browser has said what day it is.** Today is a
fact the server doesn't have, and rendering its guess then correcting it is a
hydration mismatch. `useRoundSettings` returns `ready`; guard on it.

**Colours are semantic tokens**, defined once in `app/globals.css` and mapped
into Tailwind under `@theme inline` — `inline` because the values reference
custom properties, and without it flipping `[data-theme]` would change nothing.
Never write `bg-green-600` or `text-red-500`: use `bg-surface`, `text-good`.
Good, fair and poor have tokens of their own because every score in the app is
drawn in one of the three, and the raw Tailwind colours fail contrast on a
white card.

**Motion is `motion/react`**, and every animation must survive
`prefers-reduced-motion`. The `MotionConfig` in `components/providers.tsx`
drops transforms and layout animations, and the block at the end of
`globals.css` neutralises anything animated in CSS — but a fade is neither.
Motion keeps opacity on purpose, so a component whose entrance should be
skipped rather than merely shortened has to ask `useReducedMotion()` and pass
`initial={false}`. Three of them do.

The screenshot run forces reduced motion. Anything that only exists while it
moves photographs as nothing, and anything that fades in photographs half
arrived — which is how a page of cards came to be recorded at a third of
their opacity.

**An outgoing panel is still in the document.** Anything that animates on its
way out stays clickable while it leaves, and a stale button acts on stale
data. Either keep the control outside what animates, or don't animate the
exit.

## Where things live

| | |
|---|---|
| `lib/config.ts` | Every tunable value. Bands and weights are NOT here — the model owns them |
| `lib/scoring.ts` | The scoring model, pure and tested |
| `lib/forecast.ts` | The shape of a round and of an outlook, and the pure work of summarising one |
| `lib/outlook.ts` | The fortnight cut into hours and scored, pure and tested |
| `lib/open-meteo.ts` | The weather, from whichever of the two models holds the day |
| `lib/places.ts` | Course search |
| `lib/comfort.ts` | The readings that don't score but change what you pack |
| `lib/weather-codes.ts` | WMO codes to a label and a picture |
| `tests/` | Unit tests over the pure logic in `lib/` |
| `e2e/` | Playwright; `screenshots.spec.ts` is the visual record |

## Conventions

Comments explain **why**, not what. Prefer a comment at the line over a note in
a doc — the doc will drift.

**Never put a countable fact in a doc.** No test counts, file counts, coverage
percentages or dependency versions in prose. Describe what a thing covers, not
how much of it there is.

**Comments describe the code as it stands, never how it got there.** No
"previously…", "was X", "this replaces…". If the rationale only makes sense as
a contrast, state the constraint instead. Same for naming — no `NewFoo`,
`FooV2`, or `legacy` prefixes for code that is simply the code.

**Keep commit messages and PR bodies plain.** A subject line, then a few short
paragraphs of prose. No headings, no tables, no bullet lists, no emoji. Don't
hard-wrap: one paragraph per line.

**Never mention AI tooling anywhere in the repo or its history.** No
`Co-Authored-By` trailer, no "Generated with…" footer, no mention in a comment,
commit message, PR title or body, or branch name. This holds even when the
tool's own defaults ask for it.

Match the surrounding style. British English in user-facing copy.

Tests assert behaviour, not implementation. When fixing a bug, add the test
that would have caught it.

Don't leave commented-out code, `console.log`, or `TODO` without context.

## Scope

Do what was asked. If you spot something else worth fixing, say so rather than
silently expanding the change.

Flag uncertainty rather than guessing — especially anything touching the
scoring model, which is the one thing in here anybody would notice being wrong.
