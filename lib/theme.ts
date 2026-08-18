const THEME_CHOICES = ["light", "dark", "system"] as const;
export type ThemeChoice = (typeof THEME_CHOICES)[number];

export const THEME_STORAGE_KEY = "golf-weather-theme";

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return (
    typeof value === "string" &&
    (THEME_CHOICES as readonly string[]).includes(value)
  );
}

/**
 * Applies a stored theme before first paint.
 *
 * Inlined into <head> as a blocking script — anything React does runs after
 * the browser has painted, and that paint is the white flash this exists to
 * avoid. There is no account to read a preference from, so the browser's own
 * copy is the only source.
 */
export const themeInitScript = `
(function(){
  try {
    var c = localStorage.getItem('${THEME_STORAGE_KEY}');
    if (c === 'light' || c === 'dark') {
      document.documentElement.setAttribute('data-theme', c);
    }
  } catch (e) {}
})();
`;
