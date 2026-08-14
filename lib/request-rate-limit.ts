import "server-only";

import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { requestRateLimits } from "@/db/schema";
import { getTransactionalDb } from "@/db/transactional";

export async function allowRequest(key: string, limit: number, windowMs: number) {
  const result = await getTransactionalDb().execute(sql`
    INSERT INTO ${requestRateLimits} ("key", window_started_at, count, updated_at)
    VALUES (${key}, now(), 1, now())
    ON CONFLICT ("key") DO UPDATE SET
      window_started_at = CASE
        WHEN ${requestRateLimits.windowStartedAt} <= now() - (${windowMs} * interval '1 millisecond') THEN now()
        ELSE ${requestRateLimits.windowStartedAt}
      END,
      count = CASE
        WHEN ${requestRateLimits.windowStartedAt} <= now() - (${windowMs} * interval '1 millisecond') THEN 1
        ELSE ${requestRateLimits.count} + 1
      END,
      updated_at = now()
    RETURNING count <= ${limit} AS allowed
  `);
  return result.rows[0]?.allowed === true;
}

export function requestAddress(request: Request) {
  // Only Vercel's deployment header is used outside local development. The raw
  // address is hashed so the rate-limit table does not retain an IP address.
  const raw = process.env.VERCEL ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() : undefined;
  return raw ? createHash("sha256").update(raw).digest("hex") : "anonymous";
}
