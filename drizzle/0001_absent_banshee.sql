-- Phase 1b: Drizzle Kit is the sole migration authority going forward.
-- supabase/migrations/* is frozen as historical baseline (CHECK constraints,
-- RLS deny policies, auth trigger, storage bucket). This file re-declares the
-- baseline CHECKs + indexes in Drizzle so the snapshot is truth, using
-- idempotent guards (IF NOT EXISTS / duplicate_object) because the live DB
-- already carries the 0001-0003 Supabase baseline. Safe to rerun.
CREATE TABLE IF NOT EXISTS "idempotency_keys" (
	"key" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"action" text NOT NULL,
	"status" text DEFAULT 'processing' NOT NULL,
	"response" jsonb,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "idempotency_keys_status_check" CHECK ("status" IN ('processing', 'completed', 'failed'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idempotency_keys_expires_idx" ON "idempotency_keys" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bookings_station_type_date_status_idx" ON "bookings" USING btree ("station_type_id","booking_date","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bookings_user_id_date_idx" ON "bookings" USING btree ("user_id","booking_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bookings_date_idx" ON "bookings" USING btree ("booking_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_status_created_at_idx" ON "payments" USING btree ("payment_status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_booking_idx" ON "payments" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_session_idx" ON "payments" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_status_started_at_idx" ON "sessions" USING btree ("status","started_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_station_idx" ON "sessions" USING btree ("station_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stations_type_status_idx" ON "stations" USING btree ("station_type_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stations_status_idx" ON "stations" USING btree ("status");--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "bookings" ADD CONSTRAINT "bookings_status_check" CHECK ("status" IN ('confirmed', 'checked_in', 'completed', 'cancelled', 'no_show', 'expired')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "bookings" ADD CONSTRAINT "bookings_duration_check" CHECK ("duration_hours" > 0); EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "bookings" ADD CONSTRAINT "bookings_time_check" CHECK ("end_time" > "start_time"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "payments" ADD CONSTRAINT "payments_status_check" CHECK ("payment_status" IN ('pending', 'paid', 'void')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "payments" ADD CONSTRAINT "payments_amount_check" CHECK ("amount" > 0); EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "payments" ADD CONSTRAINT "payments_method_check" CHECK ("payment_method" IS NULL OR "payment_method" IN ('cash', 'upi', 'card', 'membership_credit')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rule_type_check" CHECK ("rule_type" IN ('happy_hour', 'membership_discount', 'package', 'minute_rate')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "profiles" ADD CONSTRAINT "profiles_role_check" CHECK ("role" IN ('customer', 'staff', 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "profiles" ADD CONSTRAINT "profiles_membership_check" CHECK ("membership_type" IN ('none', 'silver', 'gold', 'platinum')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "sessions" ADD CONSTRAINT "sessions_status_check" CHECK ("status" IN ('active', 'paused', 'completed', 'force_ended')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "stations" ADD CONSTRAINT "stations_status_check" CHECK ("status" IN ('available', 'booked', 'in_use', 'maintenance', 'offline')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
