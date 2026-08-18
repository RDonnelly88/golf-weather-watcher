"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { CACHE_SECONDS } from "@/lib/config";

/**
 * The client-side provider stack, mounted once in the root layout.
 *
 * The QueryClient is created in state rather than at module scope: a module
 * singleton is shared across every request on the server, which would hand one
 * visitor's cached forecast to the next.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // The model only updates hourly, so asking again inside that
            // window is asking the same question twice. It also makes flipping
            // back to a tee time you have already looked at instant.
            staleTime: CACHE_SECONDS * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
