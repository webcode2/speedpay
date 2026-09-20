CREATE TABLE "investment_accruals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"investment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"as_of" timestamp with time zone NOT NULL,
	"principal" bigint NOT NULL,
	"accrued_return" bigint NOT NULL,
	"current_value" bigint NOT NULL,
	"expected_return" bigint NOT NULL,
	"maturity_value" bigint NOT NULL,
	"delta_accrued" bigint NOT NULL,
	"wallet_transaction_id" uuid,
	"idempotency_key" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "investment_accruals" ADD CONSTRAINT "investment_accruals_investment_id_investments_id_fk" FOREIGN KEY ("investment_id") REFERENCES "public"."investments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_accruals" ADD CONSTRAINT "investment_accruals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_accruals" ADD CONSTRAINT "investment_accruals_wallet_transaction_id_wallet_transactions_id_fk" FOREIGN KEY ("wallet_transaction_id") REFERENCES "public"."wallet_transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_accruals" ADD CONSTRAINT "investment_accruals_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "investment_accruals_investment_id_idx" ON "investment_accruals" USING btree ("investment_id");--> statement-breakpoint
CREATE INDEX "investment_accruals_user_id_idx" ON "investment_accruals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "investment_accruals_created_at_idx" ON "investment_accruals" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "investment_accruals_investment_idempotency_uid" ON "investment_accruals" USING btree ("investment_id","idempotency_key") WHERE "investment_accruals"."idempotency_key" is not null;
