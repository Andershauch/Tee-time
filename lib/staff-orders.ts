import "server-only";

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { getTransactionalDb } from "@/db/transactional";
import { orderItemOptions, orderItems, orders, orderStatusEvents } from "@/db/schema";
import type { OrderStatus } from "@/lib/order-types";
import { queueKitchenTicket } from "@/lib/kitchen-printer";

export type StaffOrder = {
  id: string;
  orderNumber: string;
  placement: "bane" | "klubhus" | "terrasse";
  locationDetail: string;
  status: OrderStatus;
  customerName: string;
  phone: string;
  requestedFor: string;
  approvedFor: string | null;
  totalOre: number;
  version: number;
  createdAt: string;
  items: Array<{ id: string; name: string; quantity: number; note: string; options: string[] }>;
};

const activeStatuses: OrderStatus[] = ["received", "approved"];
const archivedStatuses: OrderStatus[] = ["rejected", "completed", "preparing", "ready", "delivering"];

function formatOrderNumber(value: number) { return `TT-${String(value).padStart(4, "0")}`; }

async function toStaffOrders(rows: Array<typeof orders.$inferSelect>): Promise<StaffOrder[]> {
  if (!rows.length) return [];
  const db = getDb();
  const ids = rows.map((row) => row.id);
  const [itemRows, optionRows] = await Promise.all([
    db.select().from(orderItems).where(inArray(orderItems.orderId, ids)).orderBy(asc(orderItems.createdAt)),
    db.select().from(orderItemOptions).innerJoin(orderItems, eq(orderItemOptions.orderItemId, orderItems.id)).where(inArray(orderItems.orderId, ids)).orderBy(asc(orderItemOptions.createdAt)),
  ]);
  const optionsByItem = new Map<string, string[]>();
  for (const { order_item_options: option } of optionRows) optionsByItem.set(option.orderItemId, [...(optionsByItem.get(option.orderItemId) ?? []), option.optionNameSnapshot]);
  const itemsByOrder = new Map<string, typeof itemRows>();
  for (const item of itemRows) itemsByOrder.set(item.orderId, [...(itemsByOrder.get(item.orderId) ?? []), item]);
  return rows.map((row) => ({
    id: row.id,
    orderNumber: formatOrderNumber(row.orderNumber),
    placement: row.placement as StaffOrder["placement"],
    locationDetail: row.locationDetail ?? "",
    status: row.status as OrderStatus,
    customerName: row.customerName,
    phone: row.phone ?? "",
    requestedFor: row.requestedFor.toISOString(),
    approvedFor: row.approvedFor?.toISOString() ?? null,
    totalOre: row.totalOre,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    items: (itemsByOrder.get(row.id) ?? []).map((item) => ({ id: item.id, name: item.productNameSnapshot, quantity: item.quantity, note: item.note, options: optionsByItem.get(item.id) ?? [] })),
  }));
}

export async function getStaffOrders(scope: "active" | "archived" = "active") {
  const rows = await getDb().select().from(orders)
    .where(scope === "active" ? inArray(orders.status, activeStatuses) : inArray(orders.status, archivedStatuses))
    .orderBy(scope === "active" ? asc(orders.requestedFor) : desc(orders.updatedAt));
  return toStaffOrders(rows);
}

// Accepting an order is now the only staff action: "approved" is a terminal, good-path
// status (the guest is told a pickup time and there is nothing further to click).
// preparing/ready/delivering/completed are vestiges of an earlier multi-step flow — kept
// in the enum for any pre-existing rows, but nothing can transition into or out of them.
const transitions: Record<OrderStatus, OrderStatus[]> = {
  received: ["approved", "rejected"],
  approved: [],
  rejected: [],
  preparing: [],
  ready: [],
  delivering: [],
  completed: [],
};

export class StatusConflictError extends Error {}
export class IllegalStatusTransitionError extends Error {}
export class InvalidApprovedTimeError extends Error {}

export async function updateOrderStatus(input: { orderId: string; expectedVersion: number; status: OrderStatus; actorUserId: string; approvedFor?: Date }) {
  return getTransactionalDb().transaction(async (tx) => {
    const [current] = await tx.select().from(orders).where(eq(orders.id, input.orderId)).for("update");
    if (!current || current.version !== input.expectedVersion) throw new StatusConflictError("Ordren er allerede ændret på en anden tablet.");
    if (!transitions[current.status as OrderStatus].includes(input.status)) throw new IllegalStatusTransitionError("Dette statusskift er ikke tilladt.");
    if (input.approvedFor && (input.status !== "approved" || Number.isNaN(input.approvedFor.valueOf()) || input.approvedFor <= new Date())) throw new InvalidApprovedTimeError("Det foreslåede tidspunkt skal ligge frem i tiden.");
    const [updated] = await tx.update(orders).set({
      status: input.status,
      approvedFor: input.status === "approved" ? (input.approvedFor ?? current.requestedFor) : current.approvedFor,
      version: sql`${orders.version} + 1`,
      updatedAt: sql`now()`,
    }).where(and(eq(orders.id, input.orderId), eq(orders.version, input.expectedVersion))).returning();
    if (!updated) throw new StatusConflictError("Ordren er allerede ændret på en anden tablet.");
    await tx.insert(orderStatusEvents).values({ id: crypto.randomUUID(), orderId: current.id, fromStatus: current.status, toStatus: input.status, actorUserId: input.actorUserId });
    const printOutboxId = input.status === "approved" ? await queueKitchenTicket(tx, current.id) : undefined;
    return { order: updated, printOutboxId };
  });
}
