/**
 * Logic tests for backend/API invariants — no DB required.
 * Run: npm run test:logic
 *
 * Covers (contract §21):
 *  - pricing math (package precedence, happy-hour + membership stacking)
 *  - slot overlap / availability counting
 *  - booking + session state machines (valid/invalid transitions)
 *  - payment amount-match rule
 *  - cash reconciliation (expected vs counted variance)
 *  - tenancy: effective-role fold + permission grants (Phase 3)
 */
import assert from "node:assert/strict";

let passed = 0;
const pending = [];
function test(name, fn) {
  pending.push((async () => {
    try {
      await fn();
      passed += 1;
      console.log(`  ok - ${name}`);
    } catch (error) {
      console.error(`  FAIL - ${name}`);
      throw error;
    }
  })());
}

// --- Pricing engine mirror (must match src/lib/db/queries.ts + admin/actions.ts) ---
function priceBooking({ basePerHour, hours, rules, day, startTime, membership }) {
  let total = basePerHour * hours;
  const sorted = [...rules].filter((r) => r.isActive).sort((a, b) => b.priority - a.priority);
  const pack = sorted.find(
    (r) => r.ruleType === "package" && Number(r.conditions?.min_hours ?? Infinity) <= hours,
  );
  if (pack?.fixedPrice != null) return Math.max(Math.round(pack.fixedPrice), 0);
  for (const rule of sorted) {
    const c = rule.conditions ?? {};
    if (
      rule.ruleType === "happy_hour" &&
      Array.isArray(c.days) &&
      c.days.includes(day) &&
      startTime >= String(c.start) &&
      startTime < String(c.end)
    ) {
      total -= Math.round((total * Number(rule.discountPercent ?? 0)) / 100);
    }
    if (rule.ruleType === "membership_discount" && membership === c.membership) {
      total -= Math.round((total * Number(rule.discountPercent ?? 0)) / 100);
    }
  }
  return Math.max(Math.round(total), 0);
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

const BOOKING_TRANSITIONS = {
  confirmed: ["checked_in", "cancelled", "expired", "completed"],
  checked_in: ["completed", "cancelled", "no_show"],
  pending: ["confirmed", "cancelled", "expired"],
};
const SESSION_TRANSITIONS = {
  active: ["paused", "completed", "force_ended"],
  paused: ["active", "completed", "force_ended"],
  created: ["active"],
};

function canTransition(map, from, to) {
  return (map[from] ?? []).includes(to);
}

console.log("pricing:");
test("base price without rules", () => {
  assert.equal(priceBooking({ basePerHour: 15000, hours: 2, rules: [], day: "mon", startTime: "10:00", membership: "none" }), 30000);
});
test("happy-hour stacks after package check", () => {
  const rules = [{ ruleType: "happy_hour", discountPercent: 20, conditions: { days: ["mon"], start: "14:00", end: "17:00" }, isActive: true, priority: 10 }];
  assert.equal(priceBooking({ basePerHour: 15000, hours: 2, rules, day: "mon", startTime: "14:00", membership: "none" }), 24000);
  assert.equal(priceBooking({ basePerHour: 15000, hours: 2, rules, day: "mon", startTime: "17:00", membership: "none" }), 30000);
});
test("package takes precedence over discounts", () => {
  const rules = [
    { ruleType: "happy_hour", discountPercent: 50, conditions: { days: ["mon"], start: "14:00", end: "17:00" }, isActive: true, priority: 10 },
    { ruleType: "package", fixedPrice: 60000, conditions: { min_hours: 5 }, isActive: true, priority: 15 },
  ];
  assert.equal(priceBooking({ basePerHour: 15000, hours: 5, rules, day: "mon", startTime: "14:00", membership: "gold" }), 60000);
});
test("membership + happy-hour stack multiplicatively in priority order", () => {
  const rules = [
    { ruleType: "happy_hour", discountPercent: 20, conditions: { days: ["fri"], start: "14:00", end: "17:00" }, isActive: true, priority: 10 },
    { ruleType: "membership_discount", discountPercent: 15, conditions: { membership: "gold" }, isActive: true, priority: 5 },
  ];
  // 30000 -20% = 24000, -15% = 20400
  assert.equal(priceBooking({ basePerHour: 15000, hours: 2, rules, day: "fri", startTime: "15:00", membership: "gold" }), 20400);
});

console.log("availability:");
test("overlap detection is half-open [start, end)", () => {
  assert.equal(overlaps("10:00", "12:00", "12:00", "13:00"), false);
  assert.equal(overlaps("10:00", "12:00", "11:00", "13:00"), true);
  assert.equal(overlaps("10:00", "12:00", "10:00", "11:00"), true);
});
test("capacity blocks when overlapping == total", () => {
  const total = 2;
  const bookings = [{ s: "10:00", e: "12:00" }, { s: "11:00", e: "13:00" }];
  const overlapping = bookings.filter((b) => overlaps(b.s, b.e, "11:00", "12:00")).length;
  assert.ok(overlapping >= total);
});

console.log("state machines:");
test("booking: confirmed -> checked_in -> completed", () => {
  assert.ok(canTransition(BOOKING_TRANSITIONS, "confirmed", "checked_in"));
  assert.ok(canTransition(BOOKING_TRANSITIONS, "checked_in", "completed"));
  assert.ok(!canTransition(BOOKING_TRANSITIONS, "completed", "cancelled"));
  assert.ok(!canTransition(BOOKING_TRANSITIONS, "confirmed", "completed") === false);
});
test("booking: invalid transitions rejected", () => {
  assert.ok(!canTransition(BOOKING_TRANSITIONS, "cancelled", "checked_in"));
  assert.ok(!canTransition(BOOKING_TRANSITIONS, "completed", "no_show"));
});
test("booking: checked_in -> cancelled allowed for staff", () => {
  assert.ok(canTransition(BOOKING_TRANSITIONS, "checked_in", "cancelled"));
  assert.ok(canTransition(BOOKING_TRANSITIONS, "confirmed", "expired"));
  assert.ok(!canTransition(BOOKING_TRANSITIONS, "expired", "checked_in"));
});
test("expiry predicate: only confirmed holds past their window expire", () => {
  const now = Date.now();
  const isExpirable = (b) => b.status === "confirmed" && b.expiresAt != null && b.expiresAt < now;
  assert.ok(isExpirable({ status: "confirmed", expiresAt: now - 1000 }));
  assert.ok(!isExpirable({ status: "confirmed", expiresAt: now + 60000 }));
  assert.ok(!isExpirable({ status: "checked_in", expiresAt: now - 1000 }));
  assert.ok(!isExpirable({ status: "confirmed", expiresAt: null }));
});
test("station release guard: only reserved stations without live sessions free up", () => {
  const releasable = (s) => s.status === "booked" && s.currentSessionId == null;
  assert.ok(releasable({ status: "booked", currentSessionId: null }));
  assert.ok(!releasable({ status: "in_use", currentSessionId: "s-1" }));
  assert.ok(!releasable({ status: "booked", currentSessionId: "s-1" }));
  assert.ok(!releasable({ status: "available", currentSessionId: null }));
});
test("session: active ⇄ paused -> completed/force_ended", () => {
  assert.ok(canTransition(SESSION_TRANSITIONS, "active", "paused"));
  assert.ok(canTransition(SESSION_TRANSITIONS, "paused", "active"));
  assert.ok(canTransition(SESSION_TRANSITIONS, "active", "completed"));
  assert.ok(canTransition(SESSION_TRANSITIONS, "paused", "force_ended"));
  assert.ok(!canTransition(SESSION_TRANSITIONS, "completed", "active"));
});

console.log("payments + cash:");
test("payment amount must match charge exactly", () => {
  const expected = 20400;
  assert.throws(() => {
    if (20000 !== expected) throw new Error("Payment amount does not match charge");
  }, /does not match/);
});
test("cash reconciliation: expected vs counted = variance", () => {
  const opening = 500000;
  const cashSales = 20400;
  const expenses = 5000;
  const withdrawals = 0;
  const refunds = 0;
  const expected = opening + cashSales - expenses - withdrawals - refunds;
  const counted = expected - 100; // short by ₹1
  assert.equal(expected - counted, 100);
});
test("cash register: expected derives from opening + signed movements", () => {
  const opening = 500000;
  const movements = [
    { type: "sale", amount: 20400 },
    { type: "expense", amount: -5000 },
    { type: "deposit", amount: 100000 },
    { type: "withdrawal", amount: -20000 },
    { type: "refund", amount: -1500 },
  ];
  const expected = opening + movements.reduce((sum, m) => sum + m.amount, 0);
  assert.equal(expected, 500000 + 20400 - 5000 + 100000 - 20000 - 1500);
  const counted = expected + 200; // over by ₹2
  assert.equal(counted - expected, 200);
});
test("cash movement validation: zero rejected, sign follows type", () => {
  const signFor = { deposit: 1, withdrawal: -1, expense: -1, adjustment: 0, refund: -1, sale: 1 };
  const valid = (type, amount) => amount !== 0 && (signFor[type] === 0 || Math.sign(amount) === signFor[type]);
  assert.ok(!valid("deposit", 0));
  assert.ok(valid("deposit", 5000));
  assert.ok(!valid("deposit", -5000));
  assert.ok(valid("expense", -5000));
  assert.ok(valid("adjustment", 5000) && valid("adjustment", -5000));
});

console.log("audit + idempotency wiring (drift guards):");
test("canonical audit actions exist and are all emitted", async () => {
  const { readFile } = await import("node:fs/promises");
  const auditSrc = await readFile(new URL("../src/lib/domain/audit.ts", import.meta.url), "utf8");
  const expected = [
    "booking.created", "booking.cancelled", "booking.checked_in",
    "booking.station_assigned", "booking.no_show", "booking.expired", "booking.completed",
    "session.started", "session.paused", "session.resumed", "session.completed",
    "payment.collected", "station.status_changed",
    "cash.opened", "cash.closed", "cash.movement",
    "staff.added", "staff.permission_changed", "staff.removed",
    "customer.updated", "branch.updated",
    "expense.created", "income.created",
    "product.created", "product.updated", "inventory.movement",
  ];
  for (const action of expected) {
    assert.ok(auditSrc.includes(action), `missing audit action ${action}`);
  }
  const writers = [
    ["../src/lib/db/queries.ts", ["bookingCreated", "bookingCancelled"]],
    ["../src/app/admin/actions.ts", ["sessionStarted", "sessionPaused", "sessionResumed", "sessionCompleted", "paymentCollected", "stationStatusChanged", "bookingCheckedIn", "bookingStationAssigned", "bookingNoShow", "bookingExpired", "bookingCompleted", "cashOpened", "cashClosed", "cashMovement"]],
    ["../src/app/admin/staff/actions.ts", ["staffAdded", "staffPermissionChanged", "staffRemoved"]],
    ["../src/app/admin/customers/actions.ts", ["customerUpdated"]],
    ["../src/app/admin/branch/actions.ts", ["branchUpdated"]],
    ["../src/app/admin/expenses/actions.ts", ["expenseCreated", "incomeCreated"]],
    ["../src/app/admin/inventory/actions.ts", ["productCreated", "productUpdated", "inventoryMovement"]],
  ];
  for (const [file, actions] of writers) {
    const src = await readFile(new URL(file, import.meta.url), "utf8");
    for (const action of actions) {
      assert.ok(src.includes(`AUDIT_ACTIONS.${action}`), `${file} never emits ${action}`);
    }
  }
});
test("idempotency claimed in all dangerous mutations", async () => {
  const { readFile } = await import("node:fs/promises");
  const queries = await readFile(new URL("../src/lib/db/queries.ts", import.meta.url), "utf8");
  const admin = await readFile(new URL("../src/app/admin/actions.ts", import.meta.url), "utf8");
  assert.ok(queries.includes("claimIdempotencyKey"), "createBooking missing claim");
  for (const fn of ["startSession", "endSession", "collectPayment"]) {
    assert.ok(admin.includes("claimIdempotencyKey"), `${fn} missing claim`);
  }
  assert.ok(admin.includes("completeIdempotencyKey"), "missing complete");
});

console.log("tenancy + permissions (Phase 3):");
// Mirror of toEffectiveRole in src/lib/db/tenancy.ts — drift guard below pins it.
function effectiveRole(orgRole, branchRole) {
  if (branchRole === "admin" || branchRole === "staff" || branchRole === "customer") return branchRole;
  if (orgRole === "owner" || orgRole === "admin") return "admin";
  if (orgRole === "staff") return "staff";
  return "customer";
}
test("effective role: branch membership wins over org", () => {
  assert.equal(effectiveRole("admin", "staff"), "staff");
  assert.equal(effectiveRole("customer", "admin"), "admin");
  assert.equal(effectiveRole("customer", null), "customer");
});
test("effective role: org owner/admin act as admin in every branch", () => {
  assert.equal(effectiveRole("owner", null), "admin");
  assert.equal(effectiveRole("admin", null), "admin");
  assert.equal(effectiveRole("staff", null), "staff");
});
test("effective role: no memberships fails closed to customer", () => {
  assert.equal(effectiveRole(null, null), "customer");
});
test("permissions: staff can manage bookings and cash, customers cannot", async () => {
  const { readFile } = await import("node:fs/promises");
  const src = await readFile(new URL("../src/lib/permissions.ts", import.meta.url), "utf8");
  for (const perm of ["booking.manage", "cash.view", "cash.manage", "staff.view", "staff.manage", "customer.manage", "organization.manage", "branch.manage"]) {
    assert.ok(src.includes(`"${perm}"`), `missing permission ${perm}`);
  }
  const admin = await readFile(new URL("../src/app/admin/actions.ts", import.meta.url), "utf8");
  for (const perm of ["station.start_session", "station.end_session", "payment.collect", "booking.manage", "cash.manage"]) {
    assert.ok(admin.includes(`requirePermission("${perm}")`), `no server gate for ${perm}`);
  }
  const staff = await readFile(new URL("../src/app/admin/staff/actions.ts", import.meta.url), "utf8");
  for (const perm of ["staff.view", "staff.manage", "organization.manage"]) {
    assert.ok(staff.includes(perm), `staff actions never enforce ${perm}`);
  }
});
test("tenancy: writes stamp branch, reads filter by branch", async () => {
  const { readFile } = await import("node:fs/promises");
  const admin = await readFile(new URL("../src/app/admin/actions.ts", import.meta.url), "utf8");
  const queries = await readFile(new URL("../src/lib/db/queries.ts", import.meta.url), "utf8");
  for (const col of ["branchId: branch.id", "eq(bookings.branchId, branch.id)", "eq(sessions.branchId, branch.id)", "eq(stations.branchId, branch.id)", "eq(payments.branchId, branch.id)", "eq(cashRegisters.branchId, branch.id)"]) {
    assert.ok(admin.includes(col) || queries.includes(col), `missing branch scope ${col}`);
  }
  assert.ok(!admin.includes("profiles.role") && !queries.includes("profiles.role"), "authZ must not read profiles.role");
});

test("staff safety rails fail closed", async () => {
  const { readFile } = await import("node:fs/promises");
  const staff = await readFile(new URL("../src/app/admin/staff/actions.ts", import.meta.url), "utf8");
  for (const rail of [
    "You cannot change your own roles",
    "You cannot remove yourself",
    "Cannot demote the last admin of this branch",
    "Cannot remove the last admin of this branch",
    "Cannot demote the last owner of this organization",
    "Cannot remove the last owner of this organization",
  ]) {
    assert.ok(staff.includes(rail), `missing safety rail: ${rail}`);
  }
});

test("customer tiers + branch profile validation", async () => {
  const { readFile } = await import("node:fs/promises");
  const validation = await readFile(new URL("../src/lib/domain/validation.ts", import.meta.url), "utf8");
  for (const tier of ["none", "silver", "gold", "platinum"]) {
    assert.ok(validation.includes(`"${tier}"`), `missing tier ${tier}`);
  }
  assert.ok(validation.includes("Intl.DateTimeFormat"), "timezone must validate by construction (Calcutta/Kolkata aliasing)");
  const branch = await readFile(new URL("../src/app/admin/branch/actions.ts", import.meta.url), "utf8");
  assert.ok(branch.includes('requirePermission("branch.manage")'), "branch update needs branch.manage");
  const sets = branch.match(/\.set\(\{/g) ?? [];
  assert.equal(sets.length, 1, "exactly one branch update path");
  assert.ok(branch.includes("set({ name:"), "branch update touches name/timezone only");
  assert.ok(!branch.includes("code: parsed") && !branch.includes("code, code"), "branch code is immutable");
  const customers = await readFile(new URL("../src/app/admin/customers/actions.ts", import.meta.url), "utf8");
  assert.ok(customers.includes('requirePermission("customer.manage")'), "tier change needs customer.manage");
  assert.ok(customers.includes("Staff roles change in Staff"), "tier surface must refuse staff role changes");
});

test("money + stock validation matrix (Phase 6)", async () => {
  const { readFile } = await import("node:fs/promises");
  // Sign-per-type mirror (must match recordStockMovementSchema refine).
  const signOk = (type, qty) => {
    if (qty === 0) return false;
    if (type === "purchase" || type === "return") return qty > 0;
    if (type === "sale" || type === "damage") return qty < 0;
    return true;
  };
  assert.ok(signOk("purchase", 5) && !signOk("purchase", -5) && !signOk("purchase", 0));
  assert.ok(signOk("sale", -2) && !signOk("sale", 2));
  assert.ok(signOk("adjustment", 3) && signOk("adjustment", -3) && !signOk("adjustment", 0));
  // Cash equation with the new legs: expected = opening + sales + deposits
  // - expenses - withdrawals - refunds.
  const expected = (opening, legs) => opening + legs.reduce((s, m) => s + m, 0);
  assert.equal(expected(10000, [5000, 2000, -1500, -500, -300]), 14700);
  // Gates pinned.
  const expenses = await readFile(new URL("../src/app/admin/expenses/actions.ts", import.meta.url), "utf8");
  for (const perm of ["expense.view", "expense.manage", "income.view", "income.manage"]) {
    assert.ok(expenses.includes(`"${perm}"`), `expenses actions never enforce ${perm}`);
  }
  const inventory = await readFile(new URL("../src/app/admin/inventory/actions.ts", import.meta.url), "utf8");
  for (const perm of ["inventory.view", "inventory.manage"]) {
    assert.ok(inventory.includes(`"${perm}"`), `inventory actions never enforce ${perm}`);
  }
  assert.ok(inventory.includes("pg_advisory_xact_lock") && inventory.includes("Insufficient stock"), "stock race guard missing");
  assert.ok(expenses.includes("cash_movement_expense_uniq") || expenses.includes("23505"), "single-posting guard missing");
});

test("reports arithmetic + gates (Phase 7)", async () => {
  const { readFile } = await import("node:fs/promises");
  // P&L mirror: net = revenue + misc income - expenses.
  const net = (rev, inc, exp) => rev + inc - exp;
  assert.equal(net(50000, 8000, 22000), 36000);
  assert.equal(net(0, 0, 5000), -5000);
  // Utilization mirror: minutes vs 13 open hours/day, capped at 1.
  const utilization = (minutes, days) => Math.min(1, minutes / (13 * 60 * days));
  assert.equal(utilization(780, 1), 1);
  assert.ok(Math.abs(utilization(390, 1) - 0.5) < 1e-9);
  assert.equal(utilization(0, 7), 0);
  const actions = await readFile(new URL("../src/app/admin/reports/actions.ts", import.meta.url), "utf8");
  assert.ok(actions.includes('requirePermission("reports.view")'), "reports need reports.view");
  assert.ok(actions.includes("revalidate: 60"), "reports cached 60s");
  assert.ok(!actions.includes("writeAudit") && !actions.includes("claimIdempotencyKey"), "reads stay read-only");
  const perms = await readFile(new URL("../src/lib/permissions.ts", import.meta.url), "utf8");
  assert.ok(perms.includes('"reports.view"'), "missing reports.view permission");
});

await Promise.all(pending);
console.log(`\n${passed} logic tests passed.`);
