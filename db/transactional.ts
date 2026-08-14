import "server-only";

import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

neonConfig.webSocketConstructor = ws;

const globalForOrders = globalThis as typeof globalThis & { teeTimeOrderPool?: Pool };

export function getTransactionalDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required for order transactions.");
  globalForOrders.teeTimeOrderPool ??= new Pool({ connectionString, max: 3 });
  return drizzle({ client: globalForOrders.teeTimeOrderPool, schema });
}
