import "server-only";

import { and, asc, eq, inArray, lte, sql } from "drizzle-orm";
import { emailOutbox, orderItemOptions, orderItems, orders } from "@/db/schema";
import { getDb } from "@/db/client";
import { getTransactionalDb } from "@/db/transactional";
import { logOperationalEvent } from "@/lib/operational-log";
import { buildBrevoPayload } from "@/lib/brevo-payload";
import { configuredBrevoRecipient, getBrevoDeliveryMode } from "@/lib/brevo-config";

export { buildBrevoPayload } from "@/lib/brevo-payload";

const maxAttempts = 5;
const retryDelaysMinutes = [1, 5, 15, 60, 240];

type ClaimedEmail = { id: string; orderId: string; recipient: string; attempts: number; lockedAt: Date };

function errorCode(response: Response | undefined) {
  return response ? `brevo_http_${response.status}` : "brevo_network_error";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

async function claimDue(limit: number, onlyId?: string): Promise<ClaimedEmail[]> {
  return getTransactionalDb().transaction(async (tx) => {
    const conditions = [inArray(emailOutbox.status, ["pending", "failed"]), lte(emailOutbox.nextAttemptAt, new Date()), sql`${emailOutbox.attempts} < ${maxAttempts}`];
    if (onlyId) conditions.push(eq(emailOutbox.id, onlyId));
    const due = await tx.select().from(emailOutbox).where(and(...conditions)).orderBy(asc(emailOutbox.createdAt)).limit(limit).for("update", { skipLocked: true });
    if (!due.length) return [];
    const now = new Date();
    await Promise.all(due.map((row) => tx.update(emailOutbox).set({ status: "processing", attempts: sql`${emailOutbox.attempts} + 1`, lockedAt: now, updatedAt: now }).where(eq(emailOutbox.id, row.id))));
    return due.flatMap((row) => row.recipient ? [{ id: row.id, orderId: row.orderId, recipient: row.recipient, attempts: row.attempts + 1, lockedAt: now }] : []);
  });
}

async function deliveryContent(orderId: string) {
  const db = getDb();
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return undefined;
  const [items, options] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, order.id)),
    db.select().from(orderItemOptions).innerJoin(orderItems, eq(orderItemOptions.orderItemId, orderItems.id)).where(eq(orderItems.orderId, order.id)),
  ]);
  const optionsByItem = new Map<string, string[]>();
  for (const { order_item_options: option } of options) optionsByItem.set(option.orderItemId, [...(optionsByItem.get(option.orderItemId) ?? []), option.optionNameSnapshot]);
  const orderNumber = `TT-${String(order.orderNumber).padStart(4, "0")}`;
  const rows = items.map((item) => `${item.quantity}× ${item.productNameSnapshot}${optionsByItem.get(item.id)?.length ? ` (${optionsByItem.get(item.id)?.join(", ")})` : ""}`).join("\n");
  const recipientSummary = `${order.customerName}${order.phone ? ` · ${order.phone}` : ""}`;
  const subject = `Ny ordre ${orderNumber}`;
  const text = [`${orderNumber} · ${order.placement}`, `Kunde: ${recipientSummary}`, `Ønsket tidspunkt: ${new Intl.DateTimeFormat("da-DK", { dateStyle: "short", timeStyle: "short" }).format(order.requestedFor)}`, "", rows, "", `Total: ${(order.totalOre / 100).toFixed(2).replace(".", ",")} kr.`].join("\n");
  const html = `<h1>${escapeHtml(subject)}</h1><p><strong>Kunde:</strong> ${escapeHtml(recipientSummary)}</p><p><strong>Ønsket tidspunkt:</strong> ${escapeHtml(new Intl.DateTimeFormat("da-DK", { dateStyle: "short", timeStyle: "short" }).format(order.requestedFor))}</p><pre>${escapeHtml(rows)}</pre><p><strong>Total:</strong> ${escapeHtml((order.totalOre / 100).toFixed(2).replace(".", ","))} kr.</p>`;
  return { subject, text, html, orderId: order.id };
}

async function sendBrevo(claim: ClaimedEmail) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const mode = getBrevoDeliveryMode();
  if (mode === "disabled") return { ok: false as const, code: "delivery_disabled" };
  if (!apiKey || !senderEmail) return { ok: false as const, code: "brevo_not_configured" };
  const content = await deliveryContent(claim.orderId);
  if (!content) return { ok: false as const, code: "order_not_found" };
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json", "api-key": apiKey },
    body: JSON.stringify(buildBrevoPayload({ mode, senderEmail, recipient: claim.recipient, subject: content.subject, text: content.text, html: content.html })),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  }).catch(() => undefined);
  if (!response?.ok) return { ok: false as const, code: errorCode(response) };
  const body = await response.json().catch(() => undefined) as { messageId?: unknown } | undefined;
  return { ok: true as const, providerMessageId: typeof body?.messageId === "string" ? body.messageId : null };
}

async function deliverClaim(claim: ClaimedEmail) {
  const result = await sendBrevo(claim);
  if (result.ok) {
    await getDb().update(emailOutbox).set({ status: "sent", providerMessageId: result.providerMessageId, lockedAt: null, lastErrorCode: null, updatedAt: new Date() }).where(and(eq(emailOutbox.id, claim.id), eq(emailOutbox.status, "processing"), eq(emailOutbox.lockedAt, claim.lockedAt)));
    logOperationalEvent("email_delivery_sent", { outboxId: claim.id, orderId: claim.orderId });
    return { id: claim.id, status: "sent" as const };
  }
  const retry = claim.attempts < maxAttempts && result.code !== "delivery_disabled" && result.code !== "brevo_not_configured";
  const delay = retryDelaysMinutes[Math.min(claim.attempts - 1, retryDelaysMinutes.length - 1)] ?? 240;
  await getDb().update(emailOutbox).set({ status: retry ? "failed" : "blocked", nextAttemptAt: retry ? new Date(Date.now() + delay * 60_000) : null, lockedAt: null, lastErrorCode: result.code, updatedAt: new Date() }).where(and(eq(emailOutbox.id, claim.id), eq(emailOutbox.status, "processing"), eq(emailOutbox.lockedAt, claim.lockedAt)));
  logOperationalEvent("email_delivery_failed", { outboxId: claim.id, orderId: claim.orderId, code: result.code });
  return { id: claim.id, status: retry ? "failed" as const : "blocked" as const };
}

export async function deliverOutboxById(id: string) {
  const [claim] = await claimDue(1, id);
  return claim ? deliverClaim(claim) : undefined;
}

export async function retryDueEmailOutbox(limit = 20) {
  const claims = await claimDue(limit);
  return Promise.all(claims.map(deliverClaim));
}

export async function requeueConfigurationBlockedEmails() {
  const mode = getBrevoDeliveryMode();
  const recipient = configuredBrevoRecipient(mode);
  if (mode === "disabled" || !recipient || !process.env.BREVO_API_KEY || !process.env.BREVO_SENDER_EMAIL) return;
  await getDb().update(emailOutbox).set({ recipient, status: "pending", nextAttemptAt: new Date(), lastErrorCode: null, updatedAt: new Date() })
    .where(and(eq(emailOutbox.status, "blocked"), inArray(emailOutbox.lastErrorCode, ["recipient_not_configured", "delivery_disabled", "brevo_not_configured"])));
}

export async function pruneOperationalRecords() {
  const now = new Date();
  await getDb().update(emailOutbox).set({ status: "failed", nextAttemptAt: now, lockedAt: null, lastErrorCode: "delivery_lock_expired", updatedAt: now })
    .where(and(eq(emailOutbox.status, "processing"), lte(emailOutbox.lockedAt, new Date(now.getTime() - 15 * 60_000))));
}
