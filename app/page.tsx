"use client";

import { useMemo } from "react";
import { TriangleAlert } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { summariseRound } from "@/lib/forecast";
import { scoreRound } from "@/lib/scoring";
import { startHourOf, useForecast } from "@/hooks/useForecast";
import { useOutlook } from "@/hooks/useOutlook";
import { useFavouriteCourses } from "@/hooks/useFavouriteCourses";
import { useHandicap } from "@/hooks/useHandicap";
import { useRoundSettings } from "@/hooks/useRoundSettings";
import RoundForm from "@/components/round/RoundForm";
import RoundHeading from "@/components/RoundHeading";
import OverallScore from "@/components/score/OverallScore";
import FactorCard from "@/components/score/FactorCard";
import RoundTimeline from "@/components/timeline/RoundTimeline";
import OutlookGrid from "@/components/outlook/OutlookGrid";
import HandicapCard from "@/components/handicap/HandicapCard";
import ThemeToggle from "@/components/ThemeToggle";
import { Card, CardContent } from "@/components/ui/card";

/**
 * The one page.
 *
 * Settings at the top, the round's score under them, and the hours it was
 * worked out from at the bottom. Nothing is fetched until the browser has said
 * what day it is, and the scoring is derived from the forecast on every render
 * rather than held in state beside it — two copies of the same answer is how
 * they come to disagree.
 */
/**
 * The scores arriving.
 *
 * One after another rather than all at once, quickly enough that it reads as
 * the answer landing rather than as a sequence being played at you. The
 * container carries the timing so the cards need know nothing about their own
 * place in the order.
 */
const ARRIVING = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const CARD = {
  hidden: { opacity: 0, y: 12 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

export default function Page() {
  // Motion leaves opacity alone when the reader asks for less of it, which is
  // the right default and the wrong one here: a sequence of things fading in
  // one after another is the thing being objected to, not the fading. Asked
  // for less, the answer is simply there.
  const still = useReducedMotion();

  const { settings, ready, update } = useRoundSettings();
  const favourites = useFavouriteCourses();
  const handicap = useHandicap();
  const { data: forecast, isPending, error } = useForecast(settings, ready);
  const outlook = useOutlook(settings.course, ready);

  const round = useMemo(
    () =>
      forecast
        ? scoreRound(
            summariseRound(forecast, {
              startHour: startHourOf(settings),
              length: settings.length,
            })
          )
        : null,
    [forecast, settings]
  );

  return (
    <main className="page-container">
      <header className="mb-6 flex items-start justify-between gap-4 md:mb-8">
        <div>
          <h1 className="page-title">Golf Weather Watcher</h1>
          <p className="page-subtitle">
            Is it worth getting the clubs out? Pick a course, a date and a tee
            time, and the weather for those hours is scored out of a hundred.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <RoundForm settings={settings} favourites={favourites} onChange={update} />

      <section className="mt-6 space-y-6" aria-live="polite">
        {error && (
          <Card>
            <CardContent className="flex items-start gap-3 p-6">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-poor" aria-hidden />
              <div>
                <h2 className="section-title">No score for that round</h2>
                <p className="pretty mt-1 text-sm text-muted-foreground">
                  {error.message}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {isPending && !error && (
          <output aria-busy="true" className="block space-y-6">
            <span className="sr-only">Fetching the weather</span>
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="sheen h-72 rounded-lg" />
              <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="sheen h-32 rounded-lg" />
                ))}
              </div>
            </div>
            <div className="sheen h-64 rounded-lg" />
          </output>
        )}

        {forecast && round && (
          <motion.div
            // Not keyed on the round: a question the app has not answered
            // before empties this while it waits, so the block mounts fresh
            // and the entrance runs on its own. Forcing it would also replay
            // the whole stagger for an answer that was already known.
            variants={ARRIVING}
            initial={still ? false : "hidden"}
            animate="shown"
            className="space-y-6"
          >
            <motion.div variants={CARD}>
              <RoundHeading settings={settings} forecast={forecast} />
            </motion.div>

            <div className="grid gap-4 lg:grid-cols-3">
              <motion.div variants={CARD}>
                <OverallScore round={round} />
              </motion.div>

              <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
                {round.factors.map((factor) => (
                  <motion.div
                    key={factor.key}
                    variants={CARD}
                    className={factor.key === "daylight" ? "sm:col-span-2" : undefined}
                  >
                    <FactorCard factor={factor} />
                  </motion.div>
                ))}
              </div>
            </div>

            <motion.div variants={CARD}>
              <RoundTimeline forecast={forecast} />
            </motion.div>
          </motion.div>
        )}

        {outlook.isPending && !outlook.error && <div className="sheen h-80 rounded-lg" />}

        {outlook.data && (
          <OutlookGrid
            forecast={outlook.data}
            course={settings.course}
            round={{
              date: settings.date,
              startHour: startHourOf(settings),
              length: settings.length,
            }}
            onChoose={(choice) => {
              update(choice);
              // The form is at the top of the page and the outlook is at the
              // bottom of it, so choosing a window has to take you to what it
              // changed or it looks as though nothing happened.
              const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
              window.scrollTo({ top: 0, behavior: still ? "auto" : "smooth" });
            }}
          />
        )}

        {/* Independent of the weather: it needs a course and your own numbers,
            neither of which waits on a forecast. */}
        {handicap.ready && (
          <HandicapCard course={settings.course} handicap={handicap} />
        )}
      </section>
    </main>
  );
}
