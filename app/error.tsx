"use client";

import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * The last resort, for a render that threw. Everything expected — a date out
 * of range, a service that didn't answer — is reported in place on the page.
 */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="page-container">
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <TriangleAlert className="h-8 w-8 text-poor" aria-hidden />
        <h1 className="page-title">That didn't go to plan</h1>
        <p className="page-subtitle">
          Something broke on the way to the first tee. Try again, and if it
          keeps happening the weather service is probably having a day of it.
        </p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </main>
  );
}
