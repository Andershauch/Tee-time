import "./load-env";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const environment = process.env.DEPLOYMENT_ENV;

if (environment === "production") throw new Error("Refusing to migrate production. Apply production migrations through the approved deployment runbook.");
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required to apply migrations.");

const db = drizzle({ client: neon(connectionString) });
await migrate(db, { migrationsFolder: "db/migrations" });
console.info(`Migrations applied to ${environment ?? "an unspecified non-production environment"}.`);
