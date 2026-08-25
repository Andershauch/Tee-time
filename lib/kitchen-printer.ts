import "server-only";

import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, lte, sql } from "drizzle-orm";
import { orderItemOptions, orderItems, orders, printOutbox } from "@/db/schema";
import { getDb } from "@/db/client";
import { getTransactionalDb } from "@/db/transactional";
import { logOperationalEvent } from "@/lib/operational-log";

const maxAttempts = 5;
const retryDelaysMinutes = [1, 5, 15, 60, 240];

type ClaimedTicket = { id: string; orderId: string; printerTarget: string; attempts: number; lockedAt: Date };
type OrderTransaction = Parameters<Parameters<ReturnType<typeof getTransactionalDb>["transaction"]>[0]>[0];

/**
 * The kitchen printer hardware/vendor is not chosen yet. Once it is, point this at the
 * printer's ingest endpoint (a local print-relay, cloud print API, etc.) via KITCHEN_PRINTER_URL —
 * no other code needs to change. Until then jobs queue in print_outbox and stay "blocked".
 */
export function configuredKitchenPrinterTarget() {
  return process.env.KITCHEN_PRINTER_URL?.trim() || null;
}

function errorCode(response: Response | undefined) {
  return response ? `printer_http_${response.status}` : "printer_network_error";
}

export async function buildKitchenTicketText(orderId: string) {
  const db = getDb();
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return undefined;
  const [items, options] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, order.id)).orderBy(asc(orderItems.createdAt)),
    db.select().from(orderItemOptions).innerJoin(orderItems, eq(orderItemOptions.orderItemId, orderItems.id)).where(eq(orderItems.orderId, order.id)),
  ]);
  const optionsByItem = new Map<string, string[]>();
  for (const { order_item_options: option } of options) optionsByItem.set(option.orderItemId, [...(optionsByItem.get(option.orderItemId) ?? []), option.optionNameSnapshot]);
  const orderNumber = `TT-${String(order.orderNumber).padStart(4, "0")}`;
  const rows = items.map((item) => {
    const optionText = optionsByItem.get(item.id)?.length ? ` (${optionsByItem.get(item.id)?.join(", ")})` : "";
    const noteText = item.note ? `\n   Bemærkning: ${item.note}` : "";
    return `${item.quantity}× ${item.productNameSnapshot}${optionText}${noteText}`;
  }).join("\n");
  return [
    `KØKKENBON ${orderNumber}`,
    `${order.placement}${order.locationDetail ? ` · ${order.locationDetail}` : ""}`,
    order.phone ? `Tlf: ${order.phone}` : "",
    "",
    rows,
  ].filter((line) => line !== "").join("\n");
}

/** Queues a kitchen ticket for an order inside the caller's transaction; call at the moment staff accept the order. */
export async function queueKitchenTicket(tx: OrderTransaction, orderId: string) {
  const printerTarget = configuredKitchenPrinterTarget();
  const id = randomUUID();
  await tx.insert(printOutbox).values({
    id,
    orderId,
    ticketType: "kitchen_ticket",
    idempotencyKey: `kitchen-ticket:${orderId}`,
    status: printerTarget ? "pending" : "blocked",
    printerTarget,
    nextAttemptAt: printerTarget ? new Date() : null,
    lastErrorCode: printerTarget ? null : "printer_not_configured",
  }).onConflictDoNothing({ target: printOutbox.idempotencyKey });
  return id;
}

async function claimDue(limit: number, onlyId?: string): Promise<ClaimedTicket[]> {
  return getTransactionalDb().transaction(async (tx) => {
    const conditions = [inArray(printOutbox.status, ["pending", "failed"]), lte(printOutbox.nextAttemptAt, new Date()), sql`${printOutbox.attempts} < ${maxAttempts}`];
    if (onlyId) conditions.push(eq(printOutbox.id, onlyId));
    const due = await tx.select().from(printOutbox).where(and(...conditions)).orderBy(asc(printOutbox.createdAt)).limit(limit).for("update", { skipLocked: true });
    if (!due.length) return [];
    const now = new Date();
    await Promise.all(due.map((row) => tx.update(printOutbox).set({ status: "processing", attempts: sql`${printOutbox.attempts} + 1`, lockedAt: now, updatedAt: now }).where(eq(printOutbox.id, row.id))));
    return due.flatMap((row) => row.printerTarget ? [{ id: row.id, orderId: row.orderId, printerTarget: row.printerTarget, attempts: row.attempts + 1, lockedAt: now }] : []);
  });
}

async function sendToKitchenPrinter(claim: ClaimedTicket) {
  const text = await buildKitchenTicketText(claim.orderId);
  if (!text) return { ok: false as const, code: "order_not_found" };
  const response = await fetch(claim.printerTarget, {
    method: "POST",
    headers: { "content-type": "text/plain; charset=utf-8" },
    body: text,
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  }).catch(() => undefined);
  if (!response?.ok) return { ok: false as const, code: errorCode(response) };
  return { ok: true as const };
}

async function deliverClaim(claim: ClaimedTicket) {
  const result = await sendToKitchenPrinter(claim);
  if (result.ok) {
    await getDb().update(printOutbox).set({ status: "sent", lockedAt: null, lastErrorCode: null, updatedAt: new Date() }).where(and(eq(printOutbox.id, claim.id), eq(printOutbox.status, "processing"), eq(printOutbox.lockedAt, claim.lockedAt)));
    logOperationalEvent("print_delivery_sent", { outboxId: claim.id, orderId: claim.orderId });
    return { id: claim.id, status: "sent" as const };
  }
  const retry = claim.attempts < maxAttempts && result.code !== "printer_not_configured";
  const delay = retryDelaysMinutes[Math.min(claim.attempts - 1, retryDelaysMinutes.length - 1)] ?? 240;
  await getDb().update(printOutbox).set({ status: retry ? "failed" : "blocked", nextAttemptAt: retry ? new Date(Date.now() + delay * 60_000) : null, lockedAt: null, lastErrorCode: result.code, updatedAt: new Date() }).where(and(eq(printOutbox.id, claim.id), eq(printOutbox.status, "processing"), eq(printOutbox.lockedAt, claim.lockedAt)));
  logOperationalEvent("print_delivery_failed", { outboxId: claim.id, orderId: claim.orderId, code: result.code });
  return { id: claim.id, status: retry ? "failed" as const : "blocked" as const };
}

export async function deliverPrintOutboxById(id: string) {
  const [claim] = await claimDue(1, id);
  return claim ? deliverClaim(claim) : undefined;
}

export async function retryDuePrintOutbox(limit = 20) {
  const claims = await claimDue(limit);
  return Promise.all(claims.map(deliverClaim));
}

/** Once KITCHEN_PRINTER_URL is set, this wakes up tickets that were stuck "blocked" for lack of a printer. */
export async function requeueConfigurationBlockedPrintJobs() {
  const printerTarget = configuredKitchenPrinterTarget();
  if (!printerTarget) return;
  await getDb().update(printOutbox).set({ printerTarget, status: "pending", nextAttemptAt: new Date(), lastErrorCode: null, updatedAt: new Date() })
    .where(and(eq(printOutbox.status, "blocked"), eq(printOutbox.lastErrorCode, "printer_not_configured")));
}

export async function pruneOperationalPrintRecords() {
  const now = new Date();
  await getDb().update(printOutbox).set({ status: "failed", nextAttemptAt: now, lockedAt: null, lastErrorCode: "delivery_lock_expired", updatedAt: now })
    .where(and(eq(printOutbox.status, "processing"), lte(printOutbox.lockedAt, new Date(now.getTime() - 15 * 60_000))));
}
