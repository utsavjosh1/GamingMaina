DROP INDEX "open_register_uniq";--> statement-breakpoint
CREATE UNIQUE INDEX "open_register_uniq" ON "cash_registers" USING btree ("branch_id") WHERE "status" = 'open';