# Golf Weather Watcher ⛳

Is it worth getting the clubs out? Pick a course, a date and a tee time, and the
weather for exactly those hours is scored out of a hundred.

It works anywhere in the world, forwards to the end of the forecast and back to
1940, and it will tell you why it said what it said — every factor shows the
band table it was scored against.

Under that is the fortnight ahead at the same course as a heatmap — every hour
from six in the morning to ten at night, coloured by its score and marked with
its sky, with the round you have set outlined — so the question "when should I
book?" is a shape you can look at rather than a fortnight of forecasts you have
to hold in your head. Point at an hour for everything known about it, or hand
it to the form above for the full read.

An hour scores kinder than a whole round in the same weather, because less rain
falls in one. The grid is for finding the day; the score above it is the round
you would actually play.

Courses you play often can be saved. They live in your browser, and they sit at
the top of the picker.

## What it scores

Five things, four of which are weighted against each other and one of which
multiplies the rest.

| | |
|---|---|
| **Rain** | What falls over the round, or the risk of it when nothing does |
| **Temperature** | Average over the round; fifteen to twenty is the top band |
| **Wind** | Average over the round, with a penalty for gusts well above it |
| **Cloud** | Average cover, because a round in the sun is a better round |
| **Daylight** | How much of the round is played in light. Nought in the dark |

The exact weights, bands and thresholds live in `lib/scoring.ts`, which is pure
and has the tests. Nothing else in the app decides what a score is — the
outlook runs the same five factors over every hour of it.

## Where the weather comes from

[Open-Meteo](https://open-meteo.com), which needs no key and no account. Two of
its models answer, depending on the date:

- the **forecast** model for the days ahead and the last few behind
- the **archive** — reanalysis, what the weather actually did — for anything
  older

The page says which one answered, because they are different claims. Course
search is [Nominatim](https://nominatim.openstreetmap.org), OpenStreetMap's
geocoder. Both are called from route handlers under `app/api/` rather than from
the browser, so the responses are validated once and Nominatim gets the user
agent its terms ask for.

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:3000. There is nothing to configure — no keys, no
database, no accounts.

## The checks

```bash
npm run check      # typecheck → lint → knip → unit tests
npm run e2e:shots  # writes the screenshots, then look at them
```

The screenshots are served from fixtures rather than the live weather, so two
runs are comparable. They land in `e2e/screenshots/`.

## Built with

Next.js on the App Router, React, Tailwind, shadcn/ui on Radix, TanStack Query,
lucide icons and Motion. Deployed on Vercel.
