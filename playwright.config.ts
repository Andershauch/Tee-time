import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
const testBaseUrl = "http://localhost:3010";
const webServerEnv = {
  ...Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === "string")),
  NEXT_PUBLIC_APP_URL: testBaseUrl,
};

export default defineConfig({
  testDir: "./tests/e2e",
  // The suite exercises a shared development database and deliberately tests
  // rate limits. Keep it serial so parallel projects do not impersonate one
  // anonymous local client or race over the same seeded staff accounts.
  workers: 1,
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: testBaseUrl,
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev -- --port 3010",
    url: testBaseUrl,
    env: webServerEnv,
    // Never validate an unrelated process that happens to own port 3000.
    reuseExistingServer: false,
  },
  projects: [
    {
      name: "mobile-chromium",
      use: { ...devices["iPhone 13"], browserName: "chromium" },
    },
    {
      name: "tablet-chromium",
      use: { ...devices["iPad (gen 7)"], browserName: "chromium" },
    },
  ],
});
