import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, asc, desc, eq, gt, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { getTransactionalDb } from "@/db/transactional";
import { categories, emailOutbox, guestSessions, orderItemOptions, orderItems, orders, orderStatusEvents, productOptions, products } from "@/db/schema";
import type { OrderRequest } from "@/lib/order-validation";
import type { OrderStatus, OrderView } from "@/lib/order-types";
import { configuredBrevoRecipient, getBrevoDeliveryMode } from "@/lib/brevo-config";
import { getRestaurantHours, isWithinOpeningHours } from "@/lib/restaurant-settings";

const sessionLifetimeDays = 30;

export const guestSessionCookie = "tee-time-guest-session-v1";

export function hashSecret(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function newSecret() {
  return randomBytes(32).toString("base64url");
}

export async function createGuestSession() {
  const token = newSecret();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + sessionLifetimeDays * 24 * 60 * 60 * 1000);
  const session = { id: randomUUID(), sessionTokenHash: hashSecret(token), expiresAt };
  await getDb().insert(guestSessions).values(session);
  return { ...session, token };
}

export async function findGuestSession(sessionToken: string | undefined) {
  if (!sessionToken) return undefined;
  const [session] = await getDb().select().from(guestSessions).where(and(eq(guestSessions.sessionTokenHash, hashSecret(sessionToken)), gt(guestSessions.expiresAt, new Date()))).limit(1);
  return session;
}

function formatOrderNumber(orderNumber: number) {
  return `TT-${String(orderNumber).padStart(4, "0")}`;
}

function toOrderView(order: typeof orders.$inferSelect, items: Array<typeof orderItems.$inferSelect>, options: Array<typeof orderItemOptions.$inferSelect>): OrderView {
  const optionsByItem = new Map<string, Array<{ name: string; priceDeltaOre: number }>>();
  for (const option of options) optionsByItem.set(option.orderItemId, [...(optionsByItem.get(option.orderItemId) ?? []), { name: option.optionNameSnapshot, priceDeltaOre: option.priceDeltaOreSnapshot }]);
  return {
    orderNumber: formatOrderNumber(order.orderNumber),
    placement: order.placement as OrderView["placement"],
    locationDetail: order.locationDetail ?? "",
    status: order.status as OrderStatus,
    totalOre: order.totalOre,
    requestedFor: order.requestedFor.toISOString(),
    approvedFor: order.approvedFor?.toISOString(),
    createdAt: order.createdAt.toISOString(),
    items: items.map((item) => ({ id: item.id, productName: item.productNameSnapshot, unitPriceOre: item.unitPriceOreSnapshot, quantity: item.quantity, note: item.note, options: optionsByItem.get(item.id) ?? [] })),
  };
}

async function loadOrders(rows: Array<typeof orders.$inferSelect>) {
  if (!rows.length) return [];
  const db = getDb();
  const orderIds = rows.map((order) => order.id);
  const [items, options] = await Promise.all([
    db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds)).orderBy(asc(orderItems.createdAt)),
    db.select().from(orderItemOptions).innerJoin(orderItems, eq(orderItemOptions.orderItemId, orderItems.id)).where(inArray(orderItems.orderId, orderIds)).orderBy(asc(orderItemOptions.createdAt)),
  ]);
  const itemsByOrder = new Map<string, typeof items>();
  for (const item of items) itemsByOrder.set(item.orderId, [...(itemsByOrder.get(item.orderId) ?? []), item]);
  const optionsByOrder = new Map<string, Array<typeof orderItemOptions.$inferSelect>>();
  for (const { order_item_options: option, order_items: item } of options) {
    optionsByOrder.set(item.orderId, [...(optionsByOrder.get(item.orderId) ?? []), option]);
  }
  return rows.map((order) => toOrderView(order, itemsByOrder.get(order.id) ?? [], optionsByOrder.get(order.id) ?? []));
}

async function loadOrder(order: typeof orders.$inferSelect) {
  return (await loadOrders([order]))[0]!;
}

export async function createOrder(input: OrderRequest, sessionId: string) {
  const productSlugs = input.lines.map((line) => line.productId);
  const publicToken = newSecret();
  const publicTokenHash = hashSecret(publicToken);
  const requestedFor = new Date(Date.now() + input.requestedMinutes * 60 * 1000);
  const hours = await getRestaurantHours();
  if (!isWithinOpeningHours(hours, requestedFor)) throw new OrderValidationError(`Det valgte tidspunkt ligger uden for åbningstiden (${hours.opensAt}–${hours.closesAt}).`);

  const result = await getTransactionalDb().transaction(async (tx) => {
    const activeProducts = await tx.select().from(products).where(and(inArray(products.slug, productSlugs), eq(products.isActive, true))).for("update");
    const activeCategoryIds = new Set((await tx.select({ id: categories.id }).from(categories).where(eq(categories.isActive, true))).map((category) => category.id));
    const productBySlug = new Map(activeProducts.filter((product) => activeCategoryIds.has(product.categoryId)).map((product) => [product.slug, product]));
    if (productBySlug.size !== new Set(productSlugs).size || activeProducts.some((product) => product.isSoldOut)) throw new OrderValidationError("En eller flere varer er ikke længere tilgængelige.");

    const productIds = activeProducts.map((product) => product.id);
    const activeOptions = productIds.length ? await tx.select().from(productOptions).where(and(inArray(productOptions.productId, productIds), eq(productOptions.isActive, true))).for("update") : [];
    const optionsByProduct = new Map<string, typeof activeOptions>();
    for (const option of activeOptions) optionsByProduct.set(option.productId, [...(optionsByProduct.get(option.productId) ?? []), option]);

    const calculatedLines = input.lines.map((line) => {
      const product = productBySlug.get(line.productId);
      if (!product || product.isSoldOut) throw new OrderValidationError("En eller flere varer er ikke længere tilgængelige.");
      const allowedOptions = new Map((optionsByProduct.get(product.id) ?? []).map((option) => [option.name, option]));
      const selectedOptions = line.options.map((name) => {
        const option = allowedOptions.get(name);
        if (!option) throw new OrderValidationError("Et valgt tilvalg er ikke længere gyldigt.");
        return option;
      });
      const unitPriceOre = product.priceOre + selectedOptions.reduce((total, option) => total + option.priceDeltaOre, 0);
      return { line, product, selectedOptions, unitPriceOre };
    });
    const totalOre = calculatedLines.reduce((total, line) => total + line.unitPriceOre * line.line.quantity, 0);

    const [created] = await tx.insert(orders).values({
      id: randomUUID(), guestSessionId: sessionId, publicTokenHash, idempotencyKey: input.idempotencyKey,
      placement: input.placement, locationDetail: input.locationDetail || null, status: "received", customerName: input.customerName,
      phone: input.phone || null, requestedFor, totalOre,
    }).onConflictDoNothing({ target: orders.idempotencyKey }).returning();

    if (!created) return { duplicate: true as const };

    const itemValues = calculatedLines.map((calculated) => ({
      id: randomUUID(),
      orderId: created.id,
      productId: calculated.product.id,
      productNameSnapshot: calculated.product.name,
      unitPriceOreSnapshot: calculated.product.priceOre,
      quantity: calculated.line.quantity,
      note: calculated.line.note,
    }));
    await tx.insert(orderItems).values(itemValues);
    const optionValues = calculatedLines.flatMap((calculated, index) => calculated.selectedOptions.map((option) => ({
      id: randomUUID(),
      orderItemId: itemValues[index]!.id,
      optionNameSnapshot: option.name,
      priceDeltaOreSnapshot: option.priceDeltaOre,
    })));
    if (optionValues.length) await tx.insert(orderItemOptions).values(optionValues);
    await tx.insert(orderStatusEvents).values({ id: randomUUID(), orderId: created.id, toStatus: "received" });
    const recipient = configuredBrevoRecipient(getBrevoDeliveryMode());
    const outboxId = randomUUID();
    await tx.insert(emailOutbox).values({
      id: outboxId,
      orderId: created.id,
      emailType: "restaurant_new_order",
      recipient,
      idempotencyKey: `restaurant-new-order:${created.id}`,
      status: recipient ? "pending" : "blocked",
      nextAttemptAt: recipient ? new Date() : null,
      lastErrorCode: recipient ? null : "recipient_not_configured",
    });
    return { duplicate: false as const, order: created, outboxId };
  });

  if (result.duplicate) return result;
  return { ...result, order: { ...(await loadOrder(result.order)), token: publicToken } };
}

export async function getOrderByPublicToken(token: string) {
  const rows = await getDb().select({ order: orders, item: orderItems, option: orderItemOptions })
    .from(orders)
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .leftJoin(orderItemOptions, eq(orderItemOptions.orderItemId, orderItems.id))
    .where(and(eq(orders.publicTokenHash, hashSecret(token)), isNull(orders.anonymizedAt)))
    .orderBy(asc(orderItems.createdAt), asc(orderItemOptions.createdAt));
  const order = rows[0]?.order;
  if (!order) return undefined;
  const itemById = new Map<string, typeof orderItems.$inferSelect>();
  const options: Array<typeof orderItemOptions.$inferSelect> = [];
  for (const row of rows) {
    if (row.item) itemById.set(row.item.id, row.item);
    if (row.option) options.push(row.option);
  }
  return toOrderView(order, [...itemById.values()], options);
}

export async function getOrdersForSession(sessionId: string) {
  const rows = await getDb().select().from(orders).where(eq(orders.guestSessionId, sessionId)).orderBy(desc(orders.createdAt)).limit(20);
  return loadOrders(rows);
}

export async function getOrderForSession(token: string, sessionId: string) {
  const [order] = await getDb().select().from(orders).where(and(eq(orders.publicTokenHash, hashSecret(token)), eq(orders.guestSessionId, sessionId))).limit(1);
  return order ? loadOrder(order) : undefined;
}

export async function getOrdersByPublicTokens(tokens: string[]) {
  if (!tokens.length) return new Map<string, OrderView>();
  const hashToToken = new Map(tokens.map((token) => [hashSecret(token), token]));
  const rows = await getDb().select().from(orders).where(and(inArray(orders.publicTokenHash, [...hashToToken.keys()]), isNull(orders.anonymizedAt)));
  const views = await loadOrders(rows);
  const byToken = new Map<string, OrderView>();
  rows.forEach((row, index) => {
    const token = hashToToken.get(row.publicTokenHash);
    if (token) byToken.set(token, views[index]!);
  });
  return byToken;
}

export async function prepareReorder(token: string, sessionId: string) {
  const [order] = await getDb().select().from(orders).where(and(eq(orders.publicTokenHash, hashSecret(token)), eq(orders.guestSessionId, sessionId))).limit(1);
  if (!order) return undefined;
  const items = await getDb().select().from(orderItems).where(eq(orderItems.orderId, order.id));
  const options = await getDb().select().from(orderItemOptions).innerJoin(orderItems, eq(orderItemOptions.orderItemId, orderItems.id)).where(eq(orderItems.orderId, order.id));
  const productIds = items.flatMap((item) => item.productId ? [item.productId] : []);
  const activeProducts = productIds.length ? await getDb().select().from(products).where(and(inArray(products.id, productIds), eq(products.isActive, true), eq(products.isSoldOut, false))) : [];
  const productById = new Map(activeProducts.map((product) => [product.id, product]));
  const activeOptions = activeProducts.length ? await getDb().select().from(productOptions).where(and(inArray(productOptions.productId, activeProducts.map((product) => product.id)), eq(productOptions.isActive, true))) : [];
  const optionNamesByItem = new Map<string, string[]>();
  for (const { order_item_options: option } of options) optionNamesByItem.set(option.orderItemId, [...(optionNamesByItem.get(option.orderItemId) ?? []), option.optionNameSnapshot]);
  const activeOptionNames = new Map<string, Set<string>>();
  for (const option of activeOptions) activeOptionNames.set(option.productId, new Set([...(activeOptionNames.get(option.productId) ?? []), option.name]));
  const unavailable: string[] = [];
  const lines = items.flatMap((item) => {
    const product = item.productId ? productById.get(item.productId) : undefined;
    if (!product) { unavailable.push(item.productNameSnapshot); return []; }
    const optionNames = optionNamesByItem.get(item.id) ?? [];
    if (optionNames.some((name) => !activeOptionNames.get(product.id)?.has(name))) { unavailable.push(item.productNameSnapshot); return []; }
    return [{ productId: product.slug, quantity: item.quantity, options: optionNames, note: item.note }];
  });
  return { lines, unavailable };
}

export class OrderValidationError extends Error {}
