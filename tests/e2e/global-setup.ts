import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

export default async function globalSetup() {
  config({ path: ".env.local", quiet: true });
  if (process.env.DEPLOYMENT_ENV !== "local") throw new Error("E2E cleanup only runs against the explicit local environment.");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for local E2E tests.");
  await neon(process.env.DATABASE_URL)`DELETE FROM request_rate_limits`;
}
