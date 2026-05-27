import { defineConfig, loadEnv } from "vitest/config";
import { fileURLToPath } from "node:url";

// Load .env.test (falls back to .env if absent) so tests importing `@/lib/db`
// see the DATABASE_URL at module-load time, not at hook-load time.
const env = loadEnv("test", process.cwd(), "");

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/api/**/*.test.ts"],
    globals: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: env.DATABASE_URL ?? "",
      DIRECT_URL: env.DIRECT_URL ?? env.DATABASE_URL ?? "",
      AUTH_SECRET: env.AUTH_SECRET ?? "",
      TEST_BASE_URL: env.TEST_BASE_URL ?? "http://localhost:3000",
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
