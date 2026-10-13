CREATE TABLE "branch_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"branch_id" uuid NOT NULL,
	"role" text DEFAULT 'customer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "branch_membership_role_check" CHECK ("role" IN ('admin', 'staff', 'customer'))
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"org_id" uuid NOT NULL,
	"role" text DEFAULT 'customer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "org_membership_role_check" CHECK ("role" IN ('owner', 'admin', 'staff', 'customer'))
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "org_id" uuid;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
ALTER TABLE "cash_registers" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
ALTER TABLE "station_types" ADD COLUMN "org_id" uuid;--> statement-breakpoint
ALTER TABLE "stations" ADD COLUMN "branch_id" uuid;--> statement-breakpoint
ALTER TABLE "branch_memberships" ADD CONSTRAINT "branch_memberships_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branch_memberships" ADD CONSTRAINT "branch_memberships_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "branch_membership_user_branch_uniq" ON "branch_memberships" USING btree ("user_id","branch_id");--> statement-breakpoint
CREATE INDEX "branch_membership_branch_idx" ON "branch_memberships" USING btree ("branch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "branches_org_code_uniq" ON "branches" USING btree ("org_id","code");--> statement-breakpoint
CREATE INDEX "branches_org_idx" ON "branches" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "org_membership_user_org_uniq" ON "organization_memberships" USING btree ("user_id","org_id");--> statement-breakpoint
CREATE INDEX "org_membership_org_idx" ON "organization_memberships" USING btree ("org_id");--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station_types" ADD CONSTRAINT "station_types_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stations" ADD CONSTRAINT "stations_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_branch_idx" ON "audit_logs" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "bookings_branch_date_idx" ON "bookings" USING btree ("branch_id","booking_date");--> statement-breakpoint
CREATE INDEX "cash_registers_branch_idx" ON "cash_registers" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "payments_branch_idx" ON "payments" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "pricing_rules_branch_idx" ON "pricing_rules" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "sessions_branch_idx" ON "sessions" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "station_types_org_idx" ON "station_types" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "stations_branch_idx" ON "stations" USING btree ("branch_id");--> statement-breakpoint
-- Phase 3 data: seed org + default branch (idempotent by slug/code).
INSERT INTO "organizations" ("name", "slug") VALUES ('Gaming Mania Delhi', 'gaming-mania-delhi')
ON CONFLICT ("slug") DO UPDATE SET "name" = EXCLUDED."name";
--> statement-breakpoint
INSERT INTO "branches" ("org_id", "name", "code", "timezone")
SELECT "id", 'Rohini', 'rohini', 'Asia/Kolkata' FROM "organizations" WHERE "slug" = 'gaming-mania-delhi'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
-- Backfill memberships from the deprecated profiles.role (once, idempotent).
INSERT INTO "organization_memberships" ("user_id", "org_id", "role")
SELECT p."id", o."id",
  CASE WHEN p."role" IN ('owner', 'admin', 'staff', 'customer') THEN p."role" ELSE 'customer' END
FROM "profiles" p CROSS JOIN "organizations" o WHERE o."slug" = 'gaming-mania-delhi'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "branch_memberships" ("user_id", "branch_id", "role")
SELECT p."id", b."id",
  CASE WHEN p."role" = 'admin' THEN 'admin' WHEN p."role" = 'staff' THEN 'staff' ELSE 'customer' END
FROM "profiles" p
JOIN "organizations" o ON o."slug" = 'gaming-mania-delhi'
JOIN "branches" b ON b."org_id" = o."id" AND b."code" = 'rohini'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
-- Backfill tenancy on existing rows to the default branch/org.
UPDATE "stations" s SET "branch_id" = b."id" FROM "branches" b
JOIN "organizations" o ON o."id" = b."org_id" AND o."slug" = 'gaming-mania-delhi'
WHERE b."code" = 'rohini' AND s."branch_id" IS NULL;
--> statement-breakpoint
UPDATE "station_types" t SET "org_id" = o."id" FROM "organizations" o
WHERE o."slug" = 'gaming-mania-delhi' AND t."org_id" IS NULL;
--> statement-breakpoint
UPDATE "bookings" bk SET "branch_id" = b."id" FROM "branches" b
JOIN "organizations" o ON o."id" = b."org_id" AND o."slug" = 'gaming-mania-delhi'
WHERE b."code" = 'rohini' AND bk."branch_id" IS NULL;
--> statement-breakpoint
UPDATE "sessions" se SET "branch_id" = b."id" FROM "branches" b
JOIN "organizations" o ON o."id" = b."org_id" AND o."slug" = 'gaming-mania-delhi'
WHERE b."code" = 'rohini' AND se."branch_id" IS NULL;
--> statement-breakpoint
UPDATE "payments" py SET "branch_id" = b."id" FROM "branches" b
JOIN "organizations" o ON o."id" = b."org_id" AND o."slug" = 'gaming-mania-delhi'
WHERE b."code" = 'rohini' AND py."branch_id" IS NULL;
--> statement-breakpoint
UPDATE "pricing_rules" pr SET "branch_id" = b."id" FROM "branches" b
JOIN "organizations" o ON o."id" = b."org_id" AND o."slug" = 'gaming-mania-delhi'
WHERE b."code" = 'rohini' AND pr."branch_id" IS NULL;
--> statement-breakpoint
UPDATE "cash_registers" cr SET "branch_id" = b."id" FROM "branches" b
JOIN "organizations" o ON o."id" = b."org_id" AND o."slug" = 'gaming-mania-delhi'
WHERE b."code" = 'rohini' AND cr."branch_id" IS NULL;
--> statement-breakpoint
-- Verify: fail the migration rather than leave orphan tenant rows.
DO $$ DECLARE missing int; BEGIN
  SELECT count(*) INTO missing FROM "stations" WHERE "branch_id" IS NULL;
  IF missing > 0 THEN RAISE EXCEPTION 'stations missing branch_id: %', missing; END IF;
  SELECT count(*) INTO missing FROM "station_types" WHERE "org_id" IS NULL;
  IF missing > 0 THEN RAISE EXCEPTION 'station_types missing org_id: %', missing; END IF;
  SELECT count(*) INTO missing FROM "bookings" WHERE "branch_id" IS NULL;
  IF missing > 0 THEN RAISE EXCEPTION 'bookings missing branch_id: %', missing; END IF;
  SELECT count(*) INTO missing FROM "sessions" WHERE "branch_id" IS NULL;
  IF missing > 0 THEN RAISE EXCEPTION 'sessions missing branch_id: %', missing; END IF;
  SELECT count(*) INTO missing FROM "payments" WHERE "branch_id" IS NULL;
  IF missing > 0 THEN RAISE EXCEPTION 'payments missing branch_id: %', missing; END IF;
  SELECT count(*) INTO missing FROM "pricing_rules" WHERE "branch_id" IS NULL;
  IF missing > 0 THEN RAISE EXCEPTION 'pricing_rules missing branch_id: %', missing; END IF;
  SELECT count(*) INTO missing FROM "cash_registers" WHERE "branch_id" IS NULL;
  IF missing > 0 THEN RAISE EXCEPTION 'cash_registers missing branch_id: %', missing; END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "stations" ALTER COLUMN "branch_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "station_types" ALTER COLUMN "org_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "branch_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "branch_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "branch_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "pricing_rules" ALTER COLUMN "branch_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "cash_registers" ALTER COLUMN "branch_id" SET NOT NULL;
--> statement-breakpoint
-- Same deny posture as the 0002 baseline: Data API roles get nothing.
-- The server owns these tables so RLS does not apply to it.
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "branches" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "organization_memberships" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "branch_memberships" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "cash_registers" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "cash_movements" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "idempotency_keys" ENABLE ROW LEVEL SECURITY;
