import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const authUsers = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const authSessions = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
});

export const authAccounts = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const authVerifications = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ─── Phase 3: multi-tenancy (docs/PHASE_3_SPEC.md) ─────────────────────
// Phase 4: profiles.role dropped — authZ resolves from memberships only.
// for authZ. Column removal is Phase 4 cleanup.
export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const branches = pgTable("branches", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  code: text("code").notNull(),
  timezone: text("timezone").notNull().default("Asia/Kolkata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("branches_org_code_uniq").on(table.orgId, table.code),
  index("branches_org_idx").on(table.orgId),
]);

export const organizationMemberships = pgTable("organization_memberships", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("customer"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("org_membership_user_org_uniq").on(table.userId, table.orgId),
  index("org_membership_org_idx").on(table.orgId),
  check("org_membership_role_check", sql`"role" IN ('owner', 'admin', 'staff', 'customer')`),
]);

export const branchMemberships = pgTable("branch_memberships", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("customer"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("branch_membership_user_branch_uniq").on(table.userId, table.branchId),
  index("branch_membership_branch_idx").on(table.branchId),
  check("branch_membership_role_check", sql`"role" IN ('admin', 'staff', 'customer')`),
]);

export const profiles = pgTable("profiles", {
  id: text("id").primaryKey().references(() => authUsers.id, { onDelete: "cascade" }),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  phone: text("phone"),
  membershipType: text("membership_type").notNull().default("none"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, () => [
  check("profiles_membership_check", sql`"membership_type" IN ('none', 'silver', 'gold', 'platinum')`),
]);

export const stationTypes = pgTable("station_types", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull().unique(),
  category: text("category").notNull(),
  basePricePerHour: integer("base_price_per_hour").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("station_types_org_idx").on(table.orgId),
]);

export const stations = pgTable(
  "stations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    stationTypeId: uuid("station_type_id").notNull().references(() => stationTypes.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id").references(() => branches.id, { onDelete: "cascade" }),
    name: text("name").notNull().unique(),
    status: text("status").notNull().default("available"),
    currentSessionId: uuid("current_session_id"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("stations_type_status_idx").on(table.stationTypeId, table.status),
    index("stations_status_idx").on(table.status),
    index("stations_branch_idx").on(table.branchId),
    check("stations_status_check", sql`"status" IN ('available', 'booked', 'in_use', 'maintenance', 'offline')`),
  ]
);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id").references(() => branches.id, { onDelete: "cascade" }),
    stationTypeId: uuid("station_type_id").notNull().references(() => stationTypes.id, { onDelete: "cascade" }),
    stationId: uuid("station_id").references(() => stations.id, { onDelete: "set null" }),
    bookingDate: date("booking_date").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    durationHours: numeric("duration_hours", { precision: 4, scale: 2 }).notNull(),
    estimatedPrice: integer("estimated_price").notNull(),
    status: text("status").notNull().default("confirmed"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("bookings_station_type_date_status_idx").on(table.stationTypeId, table.bookingDate, table.status),
    index("bookings_user_id_date_idx").on(table.userId, table.bookingDate),
    index("bookings_date_idx").on(table.bookingDate),
    index("bookings_branch_date_idx").on(table.branchId, table.bookingDate),
    check("bookings_status_check", sql`"status" IN ('confirmed', 'checked_in', 'completed', 'cancelled', 'no_show', 'expired')`),
    check("bookings_duration_check", sql`"duration_hours" > 0`),
    check("bookings_time_check", sql`"end_time" > "start_time"`),
  ]
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "set null" }),
    branchId: uuid("branch_id").references(() => branches.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => profiles.id, { onDelete: "set null" }),
    stationId: uuid("station_id").notNull().references(() => stations.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    pausedAt: timestamp("paused_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    totalPausedMinutes: integer("total_paused_minutes").notNull().default(0),
    status: text("status").notNull().default("active"),
    startedBy: text("started_by").references(() => profiles.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("sessions_status_started_at_idx").on(table.status, table.startedAt),
    index("sessions_station_idx").on(table.stationId),
    index("sessions_branch_idx").on(table.branchId),
    check("sessions_status_check", sql`"status" IN ('active', 'paused', 'completed', 'force_ended')`),
  ]
);

export const pricingRules = pgTable("pricing_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  branchId: uuid("branch_id").references(() => branches.id, { onDelete: "cascade" }),
  stationTypeId: uuid("station_type_id").references(() => stationTypes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  ruleType: text("rule_type").notNull(),
  discountPercent: integer("discount_percent"),
  fixedPrice: integer("fixed_price"),
  conditions: jsonb("conditions").notNull().default({}),
  isActive: boolean("is_active").notNull().default(true),
  priority: integer("priority").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("pricing_rules_branch_idx").on(table.branchId),
  check("pricing_rule_type_check", sql`"rule_type" IN ('happy_hour', 'membership_discount', 'package', 'minute_rate')`),
]);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "set null" }),
    branchId: uuid("branch_id").references(() => branches.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id").references(() => sessions.id, { onDelete: "set null" }),
    userId: text("user_id").references(() => profiles.id, { onDelete: "set null" }),
    amount: integer("amount").notNull(),
    paymentMethod: text("payment_method"),
    paymentStatus: text("payment_status").notNull().default("paid"),
    upiReference: text("upi_reference"),
    collectedBy: text("collected_by").references(() => profiles.id, { onDelete: "set null" }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("payments_status_created_at_idx").on(table.paymentStatus, table.createdAt),
    index("payments_booking_idx").on(table.bookingId),
    index("payments_session_idx").on(table.sessionId),
    index("payments_branch_idx").on(table.branchId),
    check("payments_status_check", sql`"payment_status" IN ('pending', 'paid', 'void')`),
    check("payments_amount_check", sql`"amount" > 0`),
    check("payments_method_check", sql`"payment_method" IS NULL OR "payment_method" IN ('cash', 'upi', 'card', 'membership_credit')`),
  ]
);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").references(() => organizations.id, { onDelete: "set null" }),
  branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
  actorId: text("actor_id").references(() => profiles.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id"),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("audit_entity_idx").on(table.entityType, table.entityId),
  index("audit_created_idx").on(table.createdAt),
  index("audit_branch_idx").on(table.branchId),
]);

// Cash register (contract §18): immutable movement history is the source of
// truth; expected cash derives from opening + signed movements, variance is
// recorded at close and history is never rewritten.
export const cashRegisters = pgTable("cash_registers", {
  id: uuid("id").defaultRandom().primaryKey(),
  branchId: uuid("branch_id").references(() => branches.id, { onDelete: "cascade" }),
  name: text("name").notNull().default("Counter"),
  status: text("status").notNull().default("open"),
  openedBy: text("opened_by").references(() => profiles.id, { onDelete: "set null" }),
  openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
  closedBy: text("closed_by").references(() => profiles.id, { onDelete: "set null" }),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  openingAmount: integer("opening_amount").notNull().default(0),
  countedAmount: integer("counted_amount"),
  variance: integer("variance"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("cash_registers_branch_idx").on(table.branchId),
  check("cash_registers_status_check", sql`"status" IN ('open', 'closed')`),
  check("cash_registers_opening_check", sql`"opening_amount" >= 0`),
  // Single-counter invariant per branch: at most one open register each.
  uniqueIndex("open_register_uniq").on(table.branchId).where(sql`"status" = 'open'`),
]);

export const cashMovements = pgTable("cash_movements", {
  id: uuid("id").defaultRandom().primaryKey(),
  registerId: uuid("register_id").notNull().references(() => cashRegisters.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  amount: integer("amount").notNull(),
  paymentId: uuid("payment_id").references(() => payments.id, { onDelete: "set null" }),
  expenseId: uuid("expense_id").references(() => expenses.id, { onDelete: "set null" }),
  incomeId: uuid("income_id").references(() => incomes.id, { onDelete: "set null" }),
  actorId: text("actor_id").references(() => profiles.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("cash_movements_register_idx").on(table.registerId, table.createdAt),
  // One cash posting per payment: collectPayment retries replay instead of double-posting.
  uniqueIndex("cash_movement_payment_uniq").on(table.paymentId).where(sql`"payment_id" IS NOT NULL`),
  // Same single-posting rule for expense/income auto-posts.
  uniqueIndex("cash_movement_expense_uniq").on(table.expenseId).where(sql`"expense_id" IS NOT NULL`),
  uniqueIndex("cash_movement_income_uniq").on(table.incomeId).where(sql`"income_id" IS NOT NULL`),
  check("cash_movements_type_check", sql`"type" IN ('sale', 'deposit', 'withdrawal', 'expense', 'adjustment', 'refund', 'opening')`),
  check("cash_movements_amount_check", sql`"amount" <> 0`),
]);

// Phase 6: append-only money-out / misc money-in (§6). Session and booking
// revenue stays in payments — these tables never duplicate it.
export const expenses = pgTable("expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "restrict" }),
  category: text("category").notNull(),
  amount: integer("amount").notNull(),
  method: text("method").notNull(),
  vendor: text("vendor"),
  notes: text("notes"),
  actorId: text("actor_id").references(() => profiles.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("expenses_branch_idx").on(table.branchId, table.createdAt),
  check("expenses_amount_check", sql`"amount" > 0`),
  check("expenses_category_check", sql`"category" IN ('rent', 'utilities', 'salaries', 'maintenance', 'supplies', 'food_beverage', 'other')`),
  check("expenses_method_check", sql`"method" IN ('cash', 'upi', 'card', 'bank')`),
]);

export const incomes = pgTable("incomes", {
  id: uuid("id").defaultRandom().primaryKey(),
  branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "restrict" }),
  category: text("category").notNull(),
  amount: integer("amount").notNull(),
  method: text("method").notNull(),
  vendor: text("vendor"),
  notes: text("notes"),
  actorId: text("actor_id").references(() => profiles.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("incomes_branch_idx").on(table.branchId, table.createdAt),
  check("incomes_amount_check", sql`"amount" > 0`),
  check("incomes_category_check", sql`"category" IN ('food_beverage', 'membership_fee', 'service', 'other')`),
  check("incomes_method_check", sql`"method" IN ('cash', 'upi', 'card', 'bank')`),
]);

// Phase 6: branch catalog + movement history (§19). Quantity is always a
// live SUM() projection — never a stored column.
export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  unit: text("unit").notNull().default("pcs"),
  reorderLevel: integer("reorder_level").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("products_branch_idx").on(table.branchId),
  uniqueIndex("products_branch_name_uniq").on(table.branchId, table.name),
  check("products_reorder_check", sql`"reorder_level" >= 0`),
]);

export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  branchId: uuid("branch_id").notNull().references(() => branches.id, { onDelete: "restrict" }),
  type: text("type").notNull(),
  quantity: integer("quantity").notNull(),
  actorId: text("actor_id").references(() => profiles.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("stock_movements_product_idx").on(table.productId, table.createdAt),
  index("stock_movements_branch_idx").on(table.branchId, table.createdAt),
  check("stock_movements_quantity_check", sql`"quantity" <> 0`),
  check("stock_movements_type_check", sql`"type" IN ('purchase', 'sale', 'damage', 'adjustment', 'return')`),
]);

// session start/end, payment collect. A client-supplied key is claimed inside
// the domain transaction; replays return the stored response instead of
// duplicating financial/business events.
export const idempotencyKeys = pgTable("idempotency_keys", {
  key: text("key").primaryKey(),
  userId: text("user_id"),
  action: text("action").notNull(),
  status: text("status").notNull().default("processing"),
  response: jsonb("response"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idempotency_keys_expires_idx").on(table.expiresAt),
  check("idempotency_keys_status_check", sql`"status" IN ('processing', 'completed', 'failed')`),
]);

export const user = authUsers;
export const session = authSessions;
export const account = authAccounts;
export const verification = authVerifications;

export const schema = {
  user,
  session,
  account,
  verification,
  organizations,
  branches,
  organizationMemberships,
  branchMemberships,
  profiles,
  stationTypes,
  stations,
  bookings,
  sessions,
  pricingRules,
  payments,
  auditLogs,
  idempotencyKeys,
  cashRegisters,
  cashMovements,
  expenses,
  incomes,
  products,
  stockMovements,
};

export type AuthUser = typeof authUsers.$inferSelect;
export type ProfileRow = typeof profiles.$inferSelect;
export type BookingRow = typeof bookings.$inferSelect;
export type StationTypeRow = typeof stationTypes.$inferSelect;
export type StationRow = typeof stations.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
export type PaymentRow = typeof payments.$inferSelect;
export type PricingRuleRow = typeof pricingRules.$inferSelect;
export type CashRegisterRow = typeof cashRegisters.$inferSelect;
export type CashMovementRow = typeof cashMovements.$inferSelect;
export type OrganizationRow = typeof organizations.$inferSelect;
export type BranchRow = typeof branches.$inferSelect;
