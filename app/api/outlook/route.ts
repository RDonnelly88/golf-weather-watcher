import { NextResponse } from "next/server";
import { z } from "zod";

import { CACHE_SECONDS, OUTLOOK } from "@/lib/config";
import { ForecastError, fetchWeek } from "@/lib/open-meteo";

/**
 * A week of weather at one course, whole.
 *
 * The outlook scores twenty-one windows out of it, all client side, so this
 * asks Open-Meteo once for the days and hands them over unscored.
 */

const Query = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = Query.safeParse(Object.fromEntries(searchParams));

  if (!parsed.success) {
    return NextResponse.json({ error: "That isn't a place." }, { status: 400 });
  }

  try {
    const week = await fetchWeek(
      { ...parsed.data, days: OUTLOOK.days },
      request.signal
    );
    return NextResponse.json(week, {
      headers: {
        "cache-control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS}`,
      },
    });
  } catch (error) {
    if (error instanceof ForecastError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    return NextResponse.json(
      { error: "Could not reach the weather service." },
      { status: 502 }
    );
  }
}
