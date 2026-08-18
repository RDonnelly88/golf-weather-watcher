import { NextResponse } from "next/server";
import { z } from "zod";

import { CACHE_SECONDS } from "@/lib/config";
import { ForecastError, fetchRound } from "@/lib/open-meteo";

/**
 * The weather for one round.
 *
 * A route handler rather than a fetch from the browser: the query is built in
 * one place, the response is checked against a schema before anything renders
 * it, and the answer can be cached at the edge — three people asking about the
 * same tee time is one call to Open-Meteo.
 */

const Query = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected yyyy-mm-dd"),
  startHour: z.coerce.number().int().min(0).max(23),
  length: z.coerce.number().int().min(1).max(12),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = Query.safeParse(Object.fromEntries(searchParams));

  if (!parsed.success) {
    return NextResponse.json(
      { error: "That isn't a round anyone could play." },
      { status: 400 }
    );
  }

  try {
    const forecast = await fetchRound(parsed.data, request.signal);
    return NextResponse.json(forecast, {
      headers: {
        "cache-control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS}`,
      },
    });
  } catch (error) {
    if (error instanceof ForecastError) {
      // 502: the failure is upstream, and the message is already something a
      // reader can act on — a date out of range, or a model that is down.
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    return NextResponse.json(
      { error: "Could not reach the weather service." },
      { status: 502 }
    );
  }
}
