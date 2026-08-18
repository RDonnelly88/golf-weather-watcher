import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests target the pure logic in lib/ — the scoring model, the weather
// code table, the wind helpers. No DOM needed; these are plain functions.
export default defineConfig({
  resolve: {
    // The same `@/` root the app uses, so a test imports a module by the path
    // its callers use rather than by counting directories back out of tests/.
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
