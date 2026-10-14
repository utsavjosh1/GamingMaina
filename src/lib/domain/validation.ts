/**
 * Zod validation — one validation system (contract §10).
 * Server actions validate with these schemas before authZ/domain logic.
 */
import { z } from "zod";

export const uuidSchema = z.string().uuid("Invalid id");
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date (YYYY-MM-DD)");
export const timeSchema = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/, "Invalid time (HH:MM)");

export const bookingInputSchema = z.object({
  stationTypeId: uuidSchema,
  date: dateSchema,
  startTime: timeSchema.transform((t) => (t.length === 5 ? `${t}:00` : t)),
  hours: z.number().int().min(1).max(5),
  // Client-generated per attempt; retries reuse it, new attempts mint a new one.
  idempotencyKey: uuidSchema.optional(),
});

export const collectPaymentSchema = z
  .object({
    bookingId: uuidSchema.optional(),
    sessionId: uuidSchema.optional(),
    userId: z.string().max(120).optional(),
    amount: z.number().int().positive("Invalid payment amount"),
    method: z.enum(["cash", "upi", "card"]),
    upiReference: z.string().trim().max(120).optional(),
    notes: z.string().trim().max(500).optional(),
    idempotencyKey: uuidSchema.optional(),
  })
  .refine((v) => !(v.bookingId && v.sessionId), "Choose a booking or session, not both")
  .refine((v) => !(v.method === "upi" && !v.upiReference?.trim()), "UPI reference is required");

export const stationStatusSchema = z.enum(["available", "maintenance", "offline"]);

export const idempotencyKeySchema = uuidSchema;

export const checkInSchema = z.object({
  bookingId: uuidSchema,
  stationId: uuidSchema.optional(),
});

export const assignStationSchema = z.object({
  bookingId: uuidSchema,
  stationId: uuidSchema,
});

export const openRegisterSchema = z.object({
  name: z.string().trim().min(1).max(60).default("Counter"),
  openingAmount: z.number().int().min(0).max(100_000_00),
});

export const closeRegisterSchema = z.object({
  registerId: uuidSchema,
  countedAmount: z.number().int().min(0).max(100_000_00),
});

export const cashMovementSchema = z.object({
  // Signed paise: inflows positive, outflows negative. Zero never allowed.
  type: z.enum(["deposit", "withdrawal", "expense", "adjustment", "refund"]),
  amount: z.number().int().refine((v) => v !== 0 && Math.abs(v) <= 100_000_00, "Invalid movement amount"),
  notes: z.string().trim().max(500).optional(),
  idempotencyKey: uuidSchema.optional(),
});

export const orgRoleSchema = z.enum(["owner", "admin", "staff", "customer"]);
export const branchRoleSchema = z.enum(["admin", "staff", "customer"]);

export const addStaffSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email"),
  orgRole: orgRoleSchema.default("staff"),
  branchRole: branchRoleSchema.default("staff"),
});

export const changeRoleSchema = z.object({
  userId: uuidSchema.or(z.string().min(1, "Invalid user")),
  orgRole: orgRoleSchema.optional(),
  branchRole: branchRoleSchema.optional(),
}).refine((v) => v.orgRole !== undefined || v.branchRole !== undefined, "Nothing to change");

export const removeStaffSchema = z.object({
  userId: uuidSchema.or(z.string().min(1, "Invalid user")),
});

export const membershipTierSchema = z.enum(["none", "silver", "gold", "platinum"]);

export const changeTierSchema = z.object({
  userId: uuidSchema.or(z.string().min(1, "Invalid user")),
  tier: membershipTierSchema,
});

export const expenseCategorySchema = z.enum([
  "rent", "utilities", "salaries", "maintenance", "supplies", "food_beverage", "other",
]);
export const incomeCategorySchema = z.enum([
  "food_beverage", "membership_fee", "service", "other",
]);
export const moneyMethodSchema = z.enum(["cash", "upi", "card", "bank"]);

const moneyRecordSchema = z.object({
  amount: z.number().int().min(1, "Amount must be positive").max(100_000_00, "Amount too large"),
  method: moneyMethodSchema,
  vendor: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(500).optional(),
  idempotencyKey: uuidSchema.optional(),
});

export const recordExpenseSchema = moneyRecordSchema.extend({
  category: expenseCategorySchema,
});
export const recordIncomeSchema = moneyRecordSchema.extend({
  category: incomeCategorySchema,
});

export const productSchema = z.object({
  name: z.string().trim().min(2, "Name too short").max(120, "Name too long"),
  unit: z.string().trim().min(1).max(24).default("pcs"),
  reorderLevel: z.number().int().min(0).max(1_000_000).default(0),
});

export const stockMovementTypeSchema = z.enum(["purchase", "sale", "damage", "adjustment", "return"]);

export const recordStockMovementSchema = z.object({
  productId: uuidSchema,
  type: stockMovementTypeSchema,
  quantity: z.number().int().refine((v) => v !== 0 && Math.abs(v) <= 1_000_000, "Invalid quantity"),
  notes: z.string().trim().max(500).optional(),
  idempotencyKey: uuidSchema.optional(),
}).refine((v) => {
  // Sign-per-type (§19): purchases/returns add, sales/damage remove,
  // adjustments correct either way.
  if (v.type === "purchase" || v.type === "return") return v.quantity > 0;
  if (v.type === "sale" || v.type === "damage") return v.quantity < 0;
  return true;
}, "Quantity sign does not match movement type");

export const updateBranchSchema = z.object({
  name: z.string().trim().min(2, "Name too short").max(80, "Name too long"),
  // Validated by construction, not allowlist: supportedValuesOf lists
  // 'Asia/Calcutta' but not its alias 'Asia/Kolkata', which is what we store.
  timezone: z.string().trim().min(1, "Timezone required").max(64, "Timezone too long")
    .refine((tz) => {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    }, "Unknown timezone"),
});

export type BookingInput = z.infer<typeof bookingInputSchema>;
export type CollectPaymentInput = z.infer<typeof collectPaymentSchema>;
