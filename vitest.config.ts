import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";
import path from "path";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": rootDir,
    },
  },
});
