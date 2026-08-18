"use client";

import { useMemo } from "react";
import { TriangleAlert } from "lucide-react";

import { summariseRound } from "@/lib/forecast";
import { scoreRound } from "@/lib/scoring";
import { startHourOf, useForecast } from "@/hooks/useForecast";
import { useFavouriteCourses } from "@/hooks/useFavouriteCourses";
import { useRoundSettings } from "@/hooks/useRoundSettings";
import RoundForm from "@/components/round/RoundForm";
import RoundHeading from "@/components/RoundHeading";
import OverallScore from "@/components/score/OverallScore";
import FactorCard from "@/components/score/FactorCard";
import RoundTimeline from "@/components/timeline/RoundTimeline";
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
export default function Page() {
  const { settings, ready, update } = useRoundSettings();
  const favourites = useFavouriteCourses();
  const { data: forecast, isPending, error } = useForecast(settings, ready);

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
          <div className="animate-slide-up space-y-6">
            <RoundHeading settings={settings} forecast={forecast} />

            <div className="grid gap-4 lg:grid-cols-3">
              <OverallScore round={round} />

              <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
                {round.factors.map((factor) => (
                  <FactorCard
                    key={factor.key}
                    factor={factor}
                    className={factor.key === "daylight" ? "sm:col-span-2" : undefined}
                  />
                ))}
              </div>
            </div>

            <RoundTimeline forecast={forecast} />
          </div>
        )}
      </section>
    </main>
  );
}
