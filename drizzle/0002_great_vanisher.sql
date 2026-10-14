CREATE TABLE "cash_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"register_id" uuid NOT NULL,
	"type" text NOT NULL,
	"amount" integer NOT NULL,
	"payment_id" uuid,
	"actor_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cash_movements_type_check" CHECK ("type" IN ('sale', 'deposit', 'withdrawal', 'expense', 'adjustment', 'refund', 'opening')),
	CONSTRAINT "cash_movements_amount_check" CHECK ("amount" <> 0)
);
--> statement-breakpoint
CREATE TABLE "cash_registers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text DEFAULT 'Counter' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"opened_by" text,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_by" text,
	"closed_at" timestamp with time zone,
	"opening_amount" integer DEFAULT 0 NOT NULL,
	"counted_amount" integer,
	"variance" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cash_registers_status_check" CHECK ("status" IN ('open', 'closed')),
	CONSTRAINT "cash_registers_opening_check" CHECK ("opening_amount" >= 0)
);
--> statement-breakpoint
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_register_id_cash_registers_id_fk" FOREIGN KEY ("register_id") REFERENCES "public"."cash_registers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_actor_id_profiles_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_opened_by_profiles_id_fk" FOREIGN KEY ("opened_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_closed_by_profiles_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cash_movements_register_idx" ON "cash_movements" USING btree ("register_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cash_movement_payment_uniq" ON "cash_movements" USING btree ("payment_id") WHERE "payment_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "open_register_uniq" ON "cash_registers" USING btree ("status") WHERE "status" = 'open';