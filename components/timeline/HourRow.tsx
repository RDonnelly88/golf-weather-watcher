"use client";

import { useState } from "react";
import {
  ArrowUp,
  ChevronDown,
  Cloud,
  Droplets,
  Thermometer,
  Wind,
  type LucideIcon,
} from "lucide-react";

import {
  CHILL_DEGREES,
  MUGGY_DEW_POINT,
  POOR_VISIBILITY_KM,
  UV_SUNSCREEN,
  pressureNote,
  uvBand,
} from "@/lib/comfort";
import type { HourlyReading } from "@/lib/forecast";
import { describeSky } from "@/lib/weather-codes";
import { arrowRotation, compassPoint } from "@/lib/wind";
import { cn } from "@/lib/utils";
import { TONE } from "@/components/score/tone";
import { SkyIcon } from "@/components/timeline/SkyIcon";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

function Metric({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <span className="flex items-center gap-1.5 text-sm">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="tabular truncate">{children}</span>
    </span>
  );
}

function Detail({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-1">
      <dt className="text-xs text-muted-foreground">{term}</dt>
      <dd className="tabular text-sm">{children}</dd>
    </div>
  );
}

/**
 * One hour of the round, opening to everything else known about it.
 *
 * Four figures closed and eight more open, because the four are what decides
 * whether you play and the rest is what you carry. Notes only appear when
 * there is something to say: a dew point of nine is not worth a sentence, and
 * one of twenty-two is.
 */
export default function HourRow({ hour }: { hour: HourlyReading }) {
  const [open, setOpen] = useState(false);
  const sky = describeSky(hour.code);
  const uv = hour.uvIndex === null ? null : uvBand(hour.uvIndex);
  const gusty = hour.windGust !== null && hour.windGust > hour.windSpeed + 2;

  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <li className="border-b border-border last:border-b-0">
        <CollapsibleTrigger className="focus-ring flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-surface-2/60">
          <span className="tabular w-12 shrink-0 font-medium">
            {hour.time.slice(11, 16)}
          </span>

          <span className="flex shrink-0 items-center gap-2 sm:w-40">
            <SkyIcon kind={sky.kind} />
            <span className="hidden truncate text-sm text-muted-foreground sm:inline">
              {sky.label}
            </span>
          </span>

          <span className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-1 md:grid-cols-4">
            <Metric icon={Thermometer}>{Math.round(hour.temperature)}°C</Metric>

            <Metric icon={Wind}>
              {Math.round(hour.windSpeed)} mph
              <ArrowUp
                className="ml-1 inline h-3 w-3 align-[-1px] text-muted-foreground"
                style={{ transform: `rotate(${arrowRotation(hour.windDirection)}deg)` }}
                aria-hidden
              />
              {/* The arrow carries the direction on a phone; the letters and
                  the gust are what a wider screen has room for. */}
              <span className="ml-0.5 hidden text-xs text-muted-foreground sm:inline">
                {compassPoint(hour.windDirection)}
              </span>
              {gusty && (
                <span className="ml-1.5 hidden text-xs text-muted-foreground sm:inline">
                  gusting {Math.round(hour.windGust ?? 0)}
                </span>
              )}
            </Metric>

            <Metric icon={Cloud}>{Math.round(hour.cloudCover)}%</Metric>

            <Metric icon={Droplets}>
              {hour.rainfall > 0 ? `${hour.rainfall.toFixed(1)} mm` : "Dry"}
              {hour.rainChance !== null && (
                <span
                  className={cn(
                    "ml-1.5 text-xs",
                    hour.rainChance > 50 ? TONE.poor.text : "text-muted-foreground"
                  )}
                >
                  {Math.round(hour.rainChance)}%
                </span>
              )}
            </Metric>
          </span>

          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
            aria-hidden
          />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="grid gap-4 bg-surface-2/40 px-3 py-3 sm:grid-cols-3">
            <div>
              <p className="eyebrow mb-1">Comfort</p>
              <dl>
                <Detail term="Feels like">
                  {Math.round(hour.feelsLike)}°C
                  {hour.feelsLike < hour.temperature - CHILL_DEGREES && (
                    <span className="ml-1.5 text-xs text-muted-foreground">wind chill</span>
                  )}
                </Detail>
                <Detail term="Humidity">{Math.round(hour.humidity)}%</Detail>
                {hour.dewPoint !== null && (
                  <Detail term="Dew point">
                    {Math.round(hour.dewPoint)}°C
                    {hour.dewPoint > MUGGY_DEW_POINT && (
                      <span className="ml-1.5 text-xs text-muted-foreground">muggy</span>
                    )}
                  </Detail>
                )}
              </dl>
            </div>

            <div>
              <p className="eyebrow mb-1">Sun and sight</p>
              <dl>
                <Detail term="UV index">
                  {uv && hour.uvIndex !== null ? (
                    <>
                      <span className={TONE[uv.tone].text}>
                        {Math.round(hour.uvIndex)} — {uv.label}
                      </span>
                      {hour.uvIndex >= UV_SUNSCREEN && (
                        <span className="ml-1.5 text-xs text-muted-foreground">sunscreen</span>
                      )}
                    </>
                  ) : (
                    <span className="text-muted-foreground">not recorded</span>
                  )}
                </Detail>
                <Detail term="Visibility">
                  {hour.visibility === null ? (
                    <span className="text-muted-foreground">not recorded</span>
                  ) : (
                    <>
                      {Math.round(hour.visibility)} km
                      {hour.visibility < POOR_VISIBILITY_KM && (
                        <span className="ml-1.5 text-xs text-muted-foreground">poor</span>
                      )}
                    </>
                  )}
                </Detail>
              </dl>
            </div>

            <div>
              <p className="eyebrow mb-1">Air</p>
              <dl>
                <Detail term="Pressure">{Math.round(hour.pressure)} hPa</Detail>
                <Detail term="Trend">
                  <span className="text-muted-foreground">{pressureNote(hour.pressure)}</span>
                </Detail>
                {hour.windGust !== null && (
                  <Detail term="Gusts">{Math.round(hour.windGust)} mph</Detail>
                )}
              </dl>
            </div>
          </div>
        </CollapsibleContent>
      </li>
    </Collapsible>
  );
}
