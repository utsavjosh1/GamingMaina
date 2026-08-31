import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  time,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

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

export const authVerifications = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
);

export const profiles = pgTable("profiles", {
  id: text("id").primaryKey().references(() => authUsers.id, { onDelete: "cascade" }),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  phone: text("phone"),
  role: text("role").notNull().default("customer"),
  membershipType: text("membership_type").notNull().default("none"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const stationTypes = pgTable("station_types", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  category: text("category").notNull(),
  basePricePerHour: integer("base_price_per_hour").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const stations = pgTable("stations", {
  id: uuid("id").defaultRandom().primaryKey(),
  stationTypeId: uuid("station_type_id").notNull().references(() => stationTypes.id, { onDelete: "cascade" }),
  name: text("name").notNull().unique(),
  status: text("status").notNull().default("available"),
  currentSessionId: uuid("current_session_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bookings = pgTable("bookings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
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
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  userId: text("user_id").references(() => profiles.id, { onDelete: "set null" }),
  stationId: uuid("station_id").notNull().references(() => stations.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  pausedAt: timestamp("paused_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  totalPausedMinutes: integer("total_paused_minutes").notNull().default(0),
  status: text("status").notNull().default("active"),
  startedBy: text("started_by").references(() => profiles.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pricingRules = pgTable("pricing_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  stationTypeId: uuid("station_type_id").references(() => stationTypes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  ruleType: text("rule_type").notNull(),
  discountPercent: integer("discount_percent"),
  fixedPrice: integer("fixed_price"),
  conditions: jsonb("conditions").notNull().default({}),
  isActive: boolean("is_active").notNull().default(true),
  priority: integer("priority").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  sessionId: uuid("session_id").references(() => sessions.id, { onDelete: "set null" }),
  userId: text("user_id").references(() => profiles.id, { onDelete: "set null" }),
  amount: integer("amount").notNull(),
  paymentMethod: text("payment_method"),
  paymentStatus: text("payment_status").notNull().default("paid"),
  upiReference: text("upi_reference"),
  collectedBy: text("collected_by").references(() => profiles.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: text("actor_id").references(() => profiles.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id"),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Better Auth expects these four conventional model keys in the adapter schema.
export const user = authUsers;
export const session = authSessions;
export const account = authAccounts;
export const verification = authVerifications;

export const schema = {
  user,
  session,
  account,
  verification,
  profiles,
  stationTypes,
  stations,
  bookings,
  sessions,
  pricingRules,
  payments,
  auditLogs,
};

export type AuthUser = typeof authUsers.$inferSelect;
export type ProfileRow = typeof profiles.$inferSelect;
export type BookingRow = typeof bookings.$inferSelect;
export type StationTypeRow = typeof stationTypes.$inferSelect;
export type StationRow = typeof stations.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
export type PaymentRow = typeof payments.$inferSelect;
export type PricingRuleRow = typeof pricingRules.$inferSelect;
