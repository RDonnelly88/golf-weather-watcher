import { NextResponse } from "next/server";
import { z } from "zod";

import { CACHE_SECONDS } from "@/lib/config";
import { searchPlaces } from "@/lib/places";

/**
 * Course search. On the server because Nominatim's terms ask for a user agent
 * that names the caller, which a browser cannot send.
 */

const Query = z.object({ q: z.string().min(1).max(120) });

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = Query.safeParse(Object.fromEntries(searchParams));

  if (!parsed.success) {
    return NextResponse.json({ error: "Nothing to search for." }, { status: 400 });
  }

  try {
    const places = await searchPlaces(parsed.data.q, request.signal);
    return NextResponse.json(places, {
      headers: {
        // Place names don't move. A day is conservative.
        "cache-control": `public, s-maxage=${CACHE_SECONDS * 4}, stale-while-revalidate=86400`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the place search." },
      { status: 502 }
    );
  }
}
