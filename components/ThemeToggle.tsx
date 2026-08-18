"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

import {
  THEME_STORAGE_KEY,
  isThemeChoice,
  type ThemeChoice,
} from "@/lib/theme";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/ui/segmented-control";

const OPTIONS: { value: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "system", label: "System", Icon: Monitor },
  { value: "dark", label: "Dark", Icon: Moon },
];

/**
 * Writes the choice to two places: the `data-theme` attribute, so it applies
 * instantly, and localStorage, so it survives a reload. There is no account to
 * store it against, which is why `system` removes the key rather than saving
 * the word — the absence of an override is what following the OS means.
 */
export default function ThemeToggle() {
  const [choice, setChoice] = useState<ThemeChoice>("system");
  // Until this is true the control renders unpressed: the server cannot know
  // what this browser last chose, and guessing produces a hydration mismatch.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemeChoice(stored)) setChoice(stored);
    setMounted(true);
  }, []);

  function apply(next: ThemeChoice) {
    setChoice(next);

    if (next === "system") {
      localStorage.removeItem(THEME_STORAGE_KEY);
      document.documentElement.removeAttribute("data-theme");
    } else {
      localStorage.setItem(THEME_STORAGE_KEY, next);
      document.documentElement.setAttribute("data-theme", next);
    }
  }

  return (
    <SegmentedControl
      label="Colour theme"
      value={mounted ? choice : ""}
      onValueChange={(next) => apply(next as ThemeChoice)}
      className="p-0.5"
      aria-busy={!mounted}
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <SegmentedControlItem
          key={value}
          value={value}
          title={label}
          className="h-8 w-8 justify-center hover:text-accent"
        >
          <Icon size={14} aria-hidden />
          <span className="sr-only">{label}</span>
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  );
}
