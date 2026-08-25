import { relations, sql } from "drizzle-orm";
import { boolean, check, index, integer, pgTable, primaryKey, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const categories = pgTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  seedSource: text("seed_source"),
  ...timestamps,
}, (table) => [
  uniqueIndex("categories_slug_unique").on(table.slug),
  index("categories_active_sort_idx").on(table.isActive, table.sortOrder),
  check("categories_sort_order_non_negative", sql`${table.sortOrder} >= 0`),
]);

export const products = pgTable("products", {
  id: text("id").primaryKey(),
  categoryId: text("category_id").notNull().references(() => categories.id, { onDelete: "restrict", onUpdate: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description").notNull().default(""),
  priceOre: integer("price_ore").notNull(),
  imagePath: text("image_path").notNull(),
  isSoldOut: boolean("is_sold_out").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  seedSource: text("seed_source"),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
}, (table) => [
  uniqueIndex("products_slug_unique").on(table.slug),
  index("products_category_active_sort_idx").on(table.categoryId, table.isActive, table.sortOrder),
  index("products_active_sold_out_idx").on(table.isActive, table.isSoldOut),
  check("products_price_ore_non_negative", sql`${table.priceOre} >= 0`),
  check("products_sort_order_non_negative", sql`${table.sortOrder} >= 0`),
]);

export const allergens = pgTable("allergens", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  seedSource: text("seed_source"),
  ...timestamps,
}, (table) => [
  uniqueIndex("allergens_name_unique").on(table.name),
  index("allergens_active_sort_idx").on(table.isActive, table.sortOrder),
  check("allergens_sort_order_non_negative", sql`${table.sortOrder} >= 0`),
]);

export const productAllergens = pgTable("product_allergens", {
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "restrict", onUpdate: "cascade" }),
  allergenId: text("allergen_id").notNull().references(() => allergens.id, { onDelete: "restrict", onUpdate: "cascade" }),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
}, (table) => [
  primaryKey({ columns: [table.productId, table.allergenId], name: "product_allergens_primary" }),
  index("product_allergens_allergen_idx").on(table.allergenId),
]);

export const productOptions = pgTable("product_options", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "restrict", onUpdate: "cascade" }),
  name: text("name").notNull(),
  priceDeltaOre: integer("price_delta_ore").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  seedSource: text("seed_source"),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
}, (table) => [
  uniqueIndex("product_options_product_name_unique").on(table.productId, table.name),
  index("product_options_product_active_sort_idx").on(table.productId, table.isActive, table.sortOrder),
  check("product_options_price_delta_ore_non_negative", sql`${table.priceDeltaOre} >= 0`),
  check("product_options_sort_order_non_negative", sql`${table.sortOrder} >= 0`),
]);

export const offers = pgTable("offers", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  badge: text("badge").notNull().default(""),
  imagePath: text("image_path").notNull(),
  priceOre: integer("price_ore"),
  isSoldOut: boolean("is_sold_out").notNull().default(false),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  seedSource: text("seed_source"),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
}, (table) => [
  index("offers_active_schedule_sort_idx").on(table.isActive, table.startsAt, table.endsAt, table.sortOrder),
  check("offers_sort_order_non_negative", sql`${table.sortOrder} >= 0`),
  check("offers_price_ore_non_negative", sql`${table.priceOre} IS NULL OR ${table.priceOre} >= 0`),
  check("offers_valid_schedule", sql`${table.endsAt} IS NULL OR ${table.startsAt} IS NULL OR ${table.endsAt} > ${table.startsAt}`),
]);

export const guestSessions = pgTable("guest_sessions", {
  id: text("id").primaryKey(),
  sessionTokenHash: text("session_token_hash").notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("guest_sessions_token_hash_unique").on(table.sessionTokenHash),
  index("guest_sessions_expires_at_idx").on(table.expiresAt),
]);

export const staffProfiles = pgTable("staff_profiles", {
  authUserId: text("auth_user_id").primaryKey(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
}, (table) => [
  index("staff_profiles_active_role_idx").on(table.isActive, table.role),
  check("staff_profiles_role_valid", sql`${table.role} IN ('staff', 'admin')`),
]);

export const staffSessions = pgTable("staff_sessions", {
  id: text("id").primaryKey(),
  authUserId: text("auth_user_id").notNull().references(() => staffProfiles.authUserId, { onDelete: "restrict", onUpdate: "cascade" }),
  sessionTokenHash: text("session_token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("staff_sessions_token_hash_unique").on(table.sessionTokenHash),
  index("staff_sessions_user_expires_idx").on(table.authUserId, table.expiresAt),
]);

export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  guestSessionId: text("guest_session_id").references(() => guestSessions.id, { onDelete: "set null", onUpdate: "cascade" }),
  orderNumber: serial("order_number").notNull(),
  publicTokenHash: text("public_token_hash").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  placement: text("placement").notNull(),
  locationDetail: text("location_detail"),
  status: text("status").notNull().default("received"),
  customerName: text("customer_name").notNull(),
  phone: text("phone"),
  requestedFor: timestamp("requested_for", { withTimezone: true }).notNull(),
  approvedFor: timestamp("approved_for", { withTimezone: true }),
  totalOre: integer("total_ore").notNull(),
  version: integer("version").notNull().default(1),
  anonymizedAt: timestamp("anonymized_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("orders_order_number_unique").on(table.orderNumber),
  uniqueIndex("orders_public_token_hash_unique").on(table.publicTokenHash),
  uniqueIndex("orders_session_idempotency_unique").on(table.guestSessionId, table.idempotencyKey),
  uniqueIndex("orders_idempotency_key_unique").on(table.idempotencyKey),
  index("orders_guest_session_created_idx").on(table.guestSessionId, table.createdAt),
  index("orders_status_created_idx").on(table.status, table.createdAt),
  index("orders_anonymization_due_idx").on(table.anonymizedAt, table.createdAt),
  check("orders_total_ore_non_negative", sql`${table.totalOre} >= 0`),
  check("orders_version_positive", sql`${table.version} > 0`),
  check("orders_status_valid", sql`${table.status} IN ('received', 'approved', 'rejected', 'preparing', 'ready', 'delivering', 'completed')`),
  check("orders_placement_valid", sql`${table.placement} IN ('bane', 'klubhus', 'terrasse')`),
]);

export const orderItems = pgTable("order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "restrict", onUpdate: "cascade" }),
  productId: text("product_id").references(() => products.id, { onDelete: "restrict", onUpdate: "cascade" }),
  productNameSnapshot: text("product_name_snapshot").notNull(),
  unitPriceOreSnapshot: integer("unit_price_ore_snapshot").notNull(),
  quantity: integer("quantity").notNull(),
  note: text("note").notNull().default(""),
  ...timestamps,
}, (table) => [
  index("order_items_order_idx").on(table.orderId),
  check("order_items_unit_price_non_negative", sql`${table.unitPriceOreSnapshot} >= 0`),
  check("order_items_quantity_positive", sql`${table.quantity} > 0`),
  check("order_items_note_length", sql`char_length(${table.note}) <= 160`),
]);

export const orderItemOptions = pgTable("order_item_options", {
  id: text("id").primaryKey(),
  orderItemId: text("order_item_id").notNull().references(() => orderItems.id, { onDelete: "restrict", onUpdate: "cascade" }),
  optionNameSnapshot: text("option_name_snapshot").notNull(),
  priceDeltaOreSnapshot: integer("price_delta_ore_snapshot").notNull(),
  ...timestamps,
}, (table) => [
  index("order_item_options_item_idx").on(table.orderItemId),
  check("order_item_options_price_non_negative", sql`${table.priceDeltaOreSnapshot} >= 0`),
]);

export const orderStatusEvents = pgTable("order_status_events", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "restrict", onUpdate: "cascade" }),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  actorUserId: text("actor_user_id").references(() => staffProfiles.authUserId, { onDelete: "restrict", onUpdate: "cascade" }),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("order_status_events_order_created_idx").on(table.orderId, table.createdAt),
  check("order_status_events_to_status_valid", sql`${table.toStatus} IN ('received', 'approved', 'rejected', 'preparing', 'ready', 'delivering', 'completed')`),
  check("order_status_events_transition_valid", sql`(${table.fromStatus} IS NULL AND ${table.toStatus} = 'received') OR (${table.fromStatus} IN ('received', 'approved', 'rejected', 'preparing', 'ready', 'delivering', 'completed') AND ${table.toStatus} IN ('received', 'approved', 'rejected', 'preparing', 'ready', 'delivering', 'completed') AND ${table.fromStatus} <> ${table.toStatus})`),
]);

export const emailOutbox = pgTable("email_outbox", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "restrict", onUpdate: "cascade" }),
  emailType: text("email_type").notNull(),
  recipient: text("recipient"),
  idempotencyKey: text("idempotency_key").notNull(),
  status: text("status").notNull().default("pending"),
  providerMessageId: text("provider_message_id"),
  attempts: integer("attempts").notNull().default(0),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  lastErrorCode: text("last_error_code"),
  ...timestamps,
}, (table) => [
  uniqueIndex("email_outbox_idempotency_unique").on(table.idempotencyKey),
  index("email_outbox_delivery_idx").on(table.status, table.nextAttemptAt, table.createdAt),
  index("email_outbox_order_idx").on(table.orderId),
  check("email_outbox_type_valid", sql`${table.emailType} IN ('restaurant_new_order')`),
  check("email_outbox_status_valid", sql`${table.status} IN ('pending', 'processing', 'sent', 'failed', 'blocked')`),
  check("email_outbox_attempts_non_negative", sql`${table.attempts} >= 0`),
]);

export const printOutbox = pgTable("print_outbox", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "restrict", onUpdate: "cascade" }),
  ticketType: text("ticket_type").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  status: text("status").notNull().default("pending"),
  printerTarget: text("printer_target"),
  providerJobId: text("provider_job_id"),
  attempts: integer("attempts").notNull().default(0),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  lastErrorCode: text("last_error_code"),
  ...timestamps,
}, (table) => [
  uniqueIndex("print_outbox_idempotency_unique").on(table.idempotencyKey),
  index("print_outbox_delivery_idx").on(table.status, table.nextAttemptAt, table.createdAt),
  index("print_outbox_order_idx").on(table.orderId),
  check("print_outbox_type_valid", sql`${table.ticketType} IN ('kitchen_ticket')`),
  check("print_outbox_status_valid", sql`${table.status} IN ('pending', 'processing', 'sent', 'failed', 'blocked')`),
  check("print_outbox_attempts_non_negative", sql`${table.attempts} >= 0`),
]);

export const restaurantSettings = pgTable("restaurant_settings", {
  id: text("id").primaryKey().default("default"),
  opensAt: text("opens_at").notNull().default("10:00"),
  closesAt: text("closes_at").notNull().default("21:00"),
  ...timestamps,
}, (table) => [
  check("restaurant_settings_opens_at_format", sql`${table.opensAt} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'`),
  check("restaurant_settings_closes_at_format", sql`${table.closesAt} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'`),
  check("restaurant_settings_hours_valid", sql`${table.closesAt} > ${table.opensAt}`),
]);

export const requestRateLimits = pgTable("request_rate_limits", {
  key: text("key").primaryKey(),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull(),
  count: integer("count").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("request_rate_limits_updated_at_idx").on(table.updatedAt),
  check("request_rate_limits_count_positive", sql`${table.count} > 0`),
]);

export const categoriesRelations = relations(categories, ({ many }) => ({ products: many(products) }));
export const productsRelations = relations(products, ({ one, many }) => ({ category: one(categories, { fields: [products.categoryId], references: [categories.id] }), options: many(productOptions), allergens: many(productAllergens) }));
export const allergensRelations = relations(allergens, ({ many }) => ({ products: many(productAllergens) }));
export const productAllergensRelations = relations(productAllergens, ({ one }) => ({ product: one(products, { fields: [productAllergens.productId], references: [products.id] }), allergen: one(allergens, { fields: [productAllergens.allergenId], references: [allergens.id] }) }));
export const productOptionsRelations = relations(productOptions, ({ one }) => ({ product: one(products, { fields: [productOptions.productId], references: [products.id] }) }));
export const guestSessionsRelations = relations(guestSessions, ({ many }) => ({ orders: many(orders) }));
export const staffProfilesRelations = relations(staffProfiles, ({ many }) => ({ statusEvents: many(orderStatusEvents) }));
export const staffSessionsRelations = relations(staffSessions, ({ one }) => ({ profile: one(staffProfiles, { fields: [staffSessions.authUserId], references: [staffProfiles.authUserId] }) }));
export const ordersRelations = relations(orders, ({ one, many }) => ({ guestSession: one(guestSessions, { fields: [orders.guestSessionId], references: [guestSessions.id] }), items: many(orderItems), statusEvents: many(orderStatusEvents), emails: many(emailOutbox), prints: many(printOutbox) }));
export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({ order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }), options: many(orderItemOptions) }));
export const orderItemOptionsRelations = relations(orderItemOptions, ({ one }) => ({ orderItem: one(orderItems, { fields: [orderItemOptions.orderItemId], references: [orderItems.id] }) }));
export const orderStatusEventsRelations = relations(orderStatusEvents, ({ one }) => ({ order: one(orders, { fields: [orderStatusEvents.orderId], references: [orders.id] }), actor: one(staffProfiles, { fields: [orderStatusEvents.actorUserId], references: [staffProfiles.authUserId] }) }));
export const emailOutboxRelations = relations(emailOutbox, ({ one }) => ({ order: one(orders, { fields: [emailOutbox.orderId], references: [orders.id] }) }));
export const printOutboxRelations = relations(printOutbox, ({ one }) => ({ order: one(orders, { fields: [printOutbox.orderId], references: [orders.id] }) }));
