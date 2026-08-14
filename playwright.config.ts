import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
const webServerEnv = Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === "string"));

export default defineConfig({
  testDir: "./tests/e2e",
  // The suite exercises a shared development database and deliberately tests
  // rate limits. Keep it serial so parallel projects do not impersonate one
  // anonymous local client or race over the same seeded staff accounts.
  workers: 1,
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    env: webServerEnv,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: "mobile-chromium",
      use: { ...devices["iPhone 13"] },
    },
    {
      name: "tablet-chromium",
      use: { ...devices["iPad (gen 7)"] },
    },
  ],
});
