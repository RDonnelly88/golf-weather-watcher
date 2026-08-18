import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
  type LucideIcon,
} from "lucide-react";

import type { SkyKind } from "@/lib/weather-codes";
import { cn } from "@/lib/utils";

const ICONS: Record<SkyKind, LucideIcon> = {
  clear: Sun,
  "partly-cloudy": CloudSun,
  cloudy: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
  thunderstorm: CloudLightning,
};

/**
 * A sky, drawn. Sun is the only one tinted — everything else is weather, and
 * colouring drizzle differently from rain says more than the difference is
 * worth.
 */
export function SkyIcon({ kind, className }: { kind: SkyKind; className?: string }) {
  const Icon = ICONS[kind];
  return (
    <Icon
      aria-hidden
      className={cn("h-5 w-5", kind === "clear" ? "text-fair" : "text-muted-foreground", className)}
    />
  );
}
