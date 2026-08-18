import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Outfit } from "next/font/google";

import { themeInitScript } from "@/lib/theme";
import { Providers } from "@/components/providers";
import "./globals.css";

// Self-hosted at build time by next/font — no runtime request to Google, no
// render-blocking @import, and no third party learning a visitor's IP.
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-outfit",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Golf Weather Watcher",
  description:
    "Score the weather for a round of golf, anywhere, hour by hour.",
};

export const viewport: Viewport = {
  // Matches the page behind the status bar in each theme, so the browser
  // chrome doesn't clash with the app on a phone.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5fbf7" },
    { media: "(prefers-color-scheme: dark)", color: "#09110e" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB" className={`${outfit.variable} ${plexMono.variable}`} suppressHydrationWarning>
      <head>
        {/* Must run before paint — see themeInitScript. */}
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
