import { defineConfig, devices } from "@playwright/test";
import path from "path";

// Loads the same .env.local the Next dev server uses, so tests share
// HERMES_DASHBOARD_URL / HERMES_DASHBOARD_USERNAME / HERMES_DASHBOARD_PASSWORD
// with src/lib/hermes.ts instead of duplicating credentials.
import { config as loadEnv } from "dotenv";
loadEnv({ path: path.resolve(__dirname, ".env.local") });

const BASE_URL = "http://localhost:3000";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    {
      name: "ui",
      testDir: "./tests/ui",
      timeout: 30_000,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "security",
      testDir: "./tests/security",
      timeout: 30_000,
    },
    {
      // Live LLM calls, sequential multi-turn chains, real tool side
      // effects (GHL/Sheets writes) — deliberately slow and separate from
      // the fast tier. Run with `npm run test:agent`, not `npm run test:e2e`.
      name: "agent",
      testDir: "./tests/agent",
      timeout: 10 * 60_000,
      fullyParallel: false,
    },
  ],
});
