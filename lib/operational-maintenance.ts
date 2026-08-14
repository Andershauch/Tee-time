import "server-only";

import { and, eq, inArray, isNull, lt, notExists, sql } from "drizzle-orm";
import { emailOutbox, guestSessions, orderItems, orderStatusEvents, orders, requestRateLimits, staffSessions } from "@/db/schema";
import { getDb } from "@/db/client";
import { getTransactionalDb } from "@/db/transactional";
import { pruneOperationalRecords } from "@/lib/email-outbox";

const customerDataRetentionDays = 30;

export async function anonymizeExpiredCustomerData(limit = 200) {
  const cutoff = new Date(Date.now() - customerDataRetentionDays * 24 * 60 * 60_000);
  return getTransactionalDb().transaction(async (tx) => {
    const expired = await tx.select({ id: orders.id }).from(orders)
      .where(and(isNull(orders.anonymizedAt), lt(orders.createdAt, cutoff)))
      .limit(limit)
      .for("update", { skipLocked: true });
    const ids = expired.map((order) => order.id);
    if (!ids.length) return 0;
    const now = new Date();
    await Promise.all([
      tx.update(orderItems).set({ note: "" }).where(inArray(orderItems.orderId, ids)),
      tx.update(orderStatusEvents).set({ reason: null }).where(inArray(orderStatusEvents.orderId, ids)),
      tx.update(emailOutbox).set({ recipient: null, updatedAt: now }).where(inArray(emailOutbox.orderId, ids)),
      tx.update(orders).set({
        guestSessionId: null,
        customerName: "Anonymiseret",
        phone: null,
        locationDetail: null,
        publicTokenHash: sql`concat('expired:', ${orders.id})`,
        anonymizedAt: now,
        updatedAt: now,
      }).where(inArray(orders.id, ids)),
    ]);
    await tx.update(emailOutbox).set({ status: "blocked", nextAttemptAt: null, lockedAt: null, lastErrorCode: "retention_expired", updatedAt: now })
      .where(and(inArray(emailOutbox.orderId, ids), inArray(emailOutbox.status, ["pending", "failed", "processing"])));
    return ids.length;
  });
}

/** Ephemeral security records are pruned only by the authenticated cron path. */
export async function runOperationalMaintenance() {
  const now = Date.now();
  await Promise.all([
    getDb().delete(requestRateLimits).where(lt(requestRateLimits.updatedAt, new Date(now - 24 * 60 * 60_000))),
    getDb().delete(staffSessions).where(lt(staffSessions.expiresAt, new Date(now - 7 * 24 * 60 * 60_000))),
    pruneOperationalRecords(),
  ]);
  const anonymized = await anonymizeExpiredCustomerData();
  await getDb().delete(guestSessions).where(and(lt(guestSessions.expiresAt, new Date(now)), notExists(getDb().select({ id: orders.id }).from(orders).where(eq(orders.guestSessionId, guestSessions.id)))));
  return anonymized;
}
