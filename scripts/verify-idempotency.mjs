/**
 * Live mechanism check for Phase 1b idempotency (contract §7)
 * + Phase 4 tenant-isolation proofs (contract §4, §21).
 * Mirrors src/lib/domain/idempotency.ts claim/complete semantics
 * through the real table. Safe: uses a throwaway key, cleans up;
 * isolation probes run in rolled-back txs, live untouched.
 * Run: npm run db:verify
 */
import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("Set DATABASE_URL.");

const sql = postgres(connectionString, { max: 1, prepare: false });
const key = `verify-${Date.now()}`;
let failures = 0;
const check = (name, cond) => {
  console.log(`  ${cond ? "ok" : "FAIL"} - ${name}`);
  if (!cond) failures += 1;
};

try {
  // 1. Fresh claim wins.
  const claimed = await sql`
    INSERT INTO idempotency_keys (key, user_id, action, status, expires_at)
    VALUES (${key}, 'verify', 'idempotency.verify', 'processing', now() + interval '1 hour')
    ON CONFLICT DO NOTHING
    RETURNING key
  `;
  check("fresh claim wins", claimed.length === 1);

  // 2. Duplicate claim is a no-op (replay guard).
  const dup = await sql`
    INSERT INTO idempotency_keys (key, user_id, action, status, expires_at)
    VALUES (${key}, 'verify', 'idempotency.verify', 'processing', now() + interval '1 hour')
    ON CONFLICT DO NOTHING
    RETURNING key
  `;
  check("duplicate claim returns 0 rows", dup.length === 0);

  // 3. Complete stores a JSON response round-trippable via jsonb.
  const response = { bookingId: "b-1", estimatedPrice: 20400 };
  await sql`
    UPDATE idempotency_keys
    SET status = 'completed', response = ${sql.json(response)}
    WHERE key = ${key}
  `;
  const [row] = await sql`SELECT status, response FROM idempotency_keys WHERE key = ${key}`;
  check("completed with JSON response", row.status === "completed" && row.response?.estimatedPrice === 20400);

  // 4. Audit table is writable (contract §20).
  const [audit] = await sql`
    INSERT INTO audit_logs (actor_id, action, entity_type, entity_id)
    VALUES (NULL, 'idempotency.verify', 'idempotency_key', NULL)
    RETURNING id
  `;
  check("audit write succeeds", Boolean(audit?.id));
  await sql`DELETE FROM audit_logs WHERE id = ${audit.id}`;

  // 5. Cash CHECKs + single-open invariant enforce (rolled back, live untouched).
  // Each negative probe runs in a savepoint: a failed statement aborts the
  // surrounding transaction in Postgres, so probes must not share fate.
  await sql`BEGIN`;
  const probe = async (name, fn) => {
    await sql`SAVEPOINT probe`;
    try {
      await fn();
    } finally {
      await sql`ROLLBACK TO SAVEPOINT probe`;
    }
  };
  try {
    // Phase 3: tenant columns are NOT NULL — probes run inside the default branch.
    const [defBranch] = await sql`SELECT b.id FROM branches b JOIN organizations o ON o.id = b.org_id AND o.slug = 'gaming-mania-delhi' WHERE b.code = 'rohini' LIMIT 1`;
    const branchId = defBranch?.id;
    let badStatusRejected = false;
    await probe("status", async () => {
      try {
        await sql`INSERT INTO cash_registers (name, branch_id, status, opening_amount) VALUES ('verify', ${branchId}, 'bogus', 0)`;
      } catch (e) {
        badStatusRejected = e?.code === "23514";
      }
    });
    check("cash_registers_status_check rejects bogus status", badStatusRejected);

    let zeroRejected = false;
    await probe("zero", async () => {
      try {
        await sql`INSERT INTO cash_movements (register_id, type, amount) VALUES ('00000000-0000-0000-0000-000000000000', 'deposit', 0)`;
      } catch (e) {
        zeroRejected = e?.code === "23514";
      }
    });
    check("cash_movements_amount_check rejects zero", zeroRejected);

    let secondOpenRejected = false;
    await probe("open", async () => {
      await sql`INSERT INTO cash_registers (name, branch_id, status, opening_amount) VALUES ('verify-a', ${branchId}, 'open', 100)`;
      try {
        await sql`INSERT INTO cash_registers (name, branch_id, status, opening_amount) VALUES ('verify-b', ${branchId}, 'open', 100)`;
      } catch (e) {
        secondOpenRejected = e?.code === "23505";
      }
    });
    check("single open register enforced per branch", secondOpenRejected);
  } finally {
    await sql`ROLLBACK`;
  }
  const leftovers = await sql`SELECT COUNT(*)::int AS c FROM cash_registers WHERE name LIKE 'verify-%'`;
  check("verify rows rolled back", leftovers[0].c === 0);

  // 6. Tenant isolation (Phase 4, contract §4): a second branch is invisible
  // to branch-scoped predicates; cross-branch conditional writes match zero.
  const [probeType] = await sql`SELECT id FROM station_types LIMIT 1`;
  check("isolation probes have a station type", Boolean(probeType?.id));
  await sql`BEGIN`;
  try {
    const [org] = await sql`SELECT id FROM organizations WHERE slug = 'gaming-mania-delhi' LIMIT 1`;
    const [home] = await sql`SELECT id FROM branches WHERE org_id = ${org.id} AND code = 'rohini' LIMIT 1`;
    await sql`INSERT INTO branches (org_id, name, code) VALUES (${org.id}, 'Verify Branch', 'verify-branch')`;
    const [other] = await sql`SELECT id FROM branches WHERE org_id = ${org.id} AND code = 'verify-branch' LIMIT 1`;
    const [type] = await sql`SELECT id FROM station_types LIMIT 1`;
    await sql`INSERT INTO stations (branch_id, station_type_id, name, status) VALUES (${other.id}, ${type.id}, 'verify-station', 'available')`;
    // Branch-scoped read from the home branch must not see the other branch.
    const seen = await sql`SELECT COUNT(*)::int AS c FROM stations WHERE branch_id = ${home.id} AND name = 'verify-station'`;
    check("second branch invisible to scoped reads", seen[0].c === 0);
    // Cross-branch conditional write matches zero rows (same pattern the
    // app uses: every mutation predicate carries the acting branch).
    const moved = await sql`UPDATE stations SET status = 'in_use' WHERE name = 'verify-station' AND branch_id = ${home.id} AND status = 'available' RETURNING id`;
    check("cross-branch write matches zero rows", moved.length === 0);
    // Membership guards: bogus roles rejected, duplicates rejected.
    let bogusRejected = false;
    try {
      await sql`SAVEPOINT membership_probe`;
      await sql`INSERT INTO branch_memberships (user_id, branch_id, role) VALUES ('00000000-0000-0000-0000-000000000000', ${home.id}, 'superadmin')`;
    } catch (e) {
      bogusRejected = e?.code === "23514";
    } finally {
      await sql`ROLLBACK TO SAVEPOINT membership_probe`;
    }
    check("membership role CHECK rejects bogus role", bogusRejected);
    const [guest] = await sql`SELECT id FROM "user" WHERE email = 'dev.guest@example.local' LIMIT 1`;
    let dupRejected = false;
    try {
      await sql`SAVEPOINT dup_probe`;
      await sql`INSERT INTO branch_memberships (user_id, branch_id, role) VALUES (${guest.id}, ${home.id}, 'staff')`;
    } catch (e) {
      dupRejected = e?.code === "23505";
    } finally {
      await sql`ROLLBACK TO SAVEPOINT dup_probe`;
    }
    check("duplicate membership rejected", dupRejected);
    const roles = await sql`SELECT om.role AS org_role, bm.role AS branch_role FROM organization_memberships om JOIN branch_memberships bm ON bm.user_id = om.user_id AND bm.branch_id = ${home.id} WHERE om.user_id = ${guest.id} AND om.org_id = ${org.id}`;
    check("dev guest holds admin/admin", roles[0]?.org_role === "admin" && roles[0]?.branch_role === "admin");
  } finally {
    await sql`ROLLBACK`;
  }
  const stray = await sql`SELECT COUNT(*)::int AS c FROM branches WHERE code = 'verify-branch'`;
  check("isolation probes rolled back", stray[0].c === 0);

  // 7. Phase 6 financial guards (all rolled back, live untouched).
  await sql`BEGIN`;
  try {
    const [home] = await sql`SELECT id FROM branches WHERE code = 'rohini' LIMIT 1`;
    const negProbe = async (label, fn, code) => {
      let rejected = false;
      try {
        await sql`SAVEPOINT fin_probe`;
        await fn();
      } catch (e) {
        rejected = e?.code === code;
      } finally {
        await sql`ROLLBACK TO SAVEPOINT fin_probe`;
      }
      check(label, rejected);
    };
    await negProbe("expenses_amount_check rejects zero", async () => {
      await sql`INSERT INTO expenses (branch_id, category, amount, method) VALUES (${home.id}, 'supplies', 0, 'cash')`;
    }, "23514");
    await negProbe("expenses_category_check rejects bogus", async () => {
      await sql`INSERT INTO expenses (branch_id, category, amount, method) VALUES (${home.id}, 'yacht', 100, 'cash')`;
    }, "23514");
    await negProbe("incomes_amount_check rejects negative", async () => {
      await sql`INSERT INTO incomes (branch_id, category, amount, method) VALUES (${home.id}, 'service', -50, 'upi')`;
    }, "23514");
    await negProbe("stock quantity CHECK rejects zero", async () => {
      await sql`INSERT INTO products (branch_id, name) VALUES (${home.id}, 'verify-product')`;
      const [p] = await sql`SELECT id FROM products WHERE branch_id = ${home.id} AND name = 'verify-product' LIMIT 1`;
      await sql`INSERT INTO stock_movements (product_id, branch_id, type, quantity) VALUES (${p.id}, ${home.id}, 'purchase', 0)`;
    }, "23514");
    await negProbe("stock type CHECK rejects bogus", async () => {
      await sql`INSERT INTO products (branch_id, name) VALUES (${home.id}, 'verify-product')`;
      const [p] = await sql`SELECT id FROM products WHERE branch_id = ${home.id} AND name = 'verify-product' LIMIT 1`;
      await sql`INSERT INTO stock_movements (product_id, branch_id, type, quantity) VALUES (${p.id}, ${home.id}, 'teleport', 3)`;
    }, "23514");
    // Expense -> cash posting linkage + single-posting uniqueness.
    await sql`SAVEPOINT link_probe`;
    try {
      const [reg] = await sql`INSERT INTO cash_registers (branch_id, name, status, opening_amount) VALUES (${home.id}, 'verify-reg', 'open', 10000) RETURNING id`;
      const [exp] = await sql`INSERT INTO expenses (branch_id, category, amount, method) VALUES (${home.id}, 'supplies', 500, 'cash') RETURNING id`;
      await sql`INSERT INTO cash_movements (register_id, type, amount, expense_id) VALUES (${reg.id}, 'expense', -500, ${exp.id})`;
      const [joined] = await sql`SELECT m.amount, e.category FROM cash_movements m JOIN expenses e ON e.id = m.expense_id WHERE m.expense_id = ${exp.id}`;
      check("expense cash leg links correctly", joined?.amount === -500 && joined?.category === "supplies");
      let dupRejected = false;
      try {
        await sql`SAVEPOINT dup_leg_probe`;
        await sql`INSERT INTO cash_movements (register_id, type, amount, expense_id) VALUES (${reg.id}, 'expense', -500, ${exp.id})`;
      } catch (e) {
        dupRejected = e?.code === "23505";
      } finally {
        await sql`ROLLBACK TO SAVEPOINT dup_leg_probe`;
      }
      check("second posting for same expense rejected", dupRejected);
    } finally {
      await sql`ROLLBACK TO SAVEPOINT link_probe`;
    }
  } finally {
    await sql`ROLLBACK`;
  }
  // Advisory-lock serialization primitive (two sessions, live untouched).
  const sqlB = postgres(connectionString, { max: 1, prepare: false });
  try {
    await sql`SELECT pg_advisory_lock(424242)`;
    const [taken] = await sqlB`SELECT pg_try_advisory_lock(424242) AS held`;
    check("advisory lock serializes across sessions", taken?.held === false);
  } finally {
    await sql`SELECT pg_advisory_unlock(424242)`;
    await sqlB.end({ timeout: 5 });
  }
} finally {
  await sql`DELETE FROM idempotency_keys WHERE key = ${key}`;
  await sql.end({ timeout: 5 });
}

if (failures > 0) {
  console.error(`${failures} mechanism check(s) failed.`);
  process.exit(1);
}
console.log("Idempotency + audit mechanism verified against live DB.");
