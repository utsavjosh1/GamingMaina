CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"category" text NOT NULL,
	"amount" integer NOT NULL,
	"method" text NOT NULL,
	"vendor" text,
	"notes" text,
	"actor_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expenses_amount_check" CHECK ("amount" > 0),
	CONSTRAINT "expenses_category_check" CHECK ("category" IN ('rent', 'utilities', 'salaries', 'maintenance', 'supplies', 'food_beverage', 'other')),
	CONSTRAINT "expenses_method_check" CHECK ("method" IN ('cash', 'upi', 'card', 'bank'))
);
--> statement-breakpoint
CREATE TABLE "incomes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"category" text NOT NULL,
	"amount" integer NOT NULL,
	"method" text NOT NULL,
	"vendor" text,
	"notes" text,
	"actor_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "incomes_amount_check" CHECK ("amount" > 0),
	CONSTRAINT "incomes_category_check" CHECK ("category" IN ('food_beverage', 'membership_fee', 'service', 'other')),
	CONSTRAINT "incomes_method_check" CHECK ("method" IN ('cash', 'upi', 'card', 'bank'))
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"name" text NOT NULL,
	"unit" text DEFAULT 'pcs' NOT NULL,
	"reorder_level" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_reorder_check" CHECK ("reorder_level" >= 0)
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"type" text NOT NULL,
	"quantity" integer NOT NULL,
	"actor_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_movements_quantity_check" CHECK ("quantity" <> 0),
	CONSTRAINT "stock_movements_type_check" CHECK ("type" IN ('purchase', 'sale', 'damage', 'adjustment', 'return'))
);
--> statement-breakpoint
ALTER TABLE "cash_movements" ADD COLUMN "expense_id" uuid;--> statement-breakpoint
ALTER TABLE "cash_movements" ADD COLUMN "income_id" uuid;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_actor_id_profiles_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_actor_id_profiles_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_actor_id_profiles_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expenses_branch_idx" ON "expenses" USING btree ("branch_id","created_at");--> statement-breakpoint
CREATE INDEX "incomes_branch_idx" ON "incomes" USING btree ("branch_id","created_at");--> statement-breakpoint
CREATE INDEX "products_branch_idx" ON "products" USING btree ("branch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "products_branch_name_uniq" ON "products" USING btree ("branch_id","name");--> statement-breakpoint
CREATE INDEX "stock_movements_product_idx" ON "stock_movements" USING btree ("product_id","created_at");--> statement-breakpoint
CREATE INDEX "stock_movements_branch_idx" ON "stock_movements" USING btree ("branch_id","created_at");--> statement-breakpoint
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_income_id_incomes_id_fk" FOREIGN KEY ("income_id") REFERENCES "public"."incomes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cash_movement_expense_uniq" ON "cash_movements" USING btree ("expense_id") WHERE "expense_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "cash_movement_income_uniq" ON "cash_movements" USING btree ("income_id") WHERE "income_id" IS NOT NULL;--> statement-breakpoint
-- Phase 6: deny posture — the server owns these tables, same as 0002–0004.
ALTER TABLE "expenses" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "incomes" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "stock_movements" ENABLE ROW LEVEL SECURITY;
