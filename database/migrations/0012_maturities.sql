CREATE TABLE "maturities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"investment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"principal" bigint NOT NULL,
	"expected_return" bigint NOT NULL,
	"maturity_value" bigint NOT NULL,
	"prior_accrued" bigint NOT NULL,
	"available_credited" bigint NOT NULL,
	"pending_debited" bigint NOT NULL,
	"idempotency_key" text,
	"processed_by" uuid NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "maturities_investment_id_unique" UNIQUE("investment_id")
);
--> statement-breakpoint
ALTER TABLE "maturities" ADD CONSTRAINT "maturities_investment_id_investments_id_fk" FOREIGN KEY ("investment_id") REFERENCES "public"."investments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maturities" ADD CONSTRAINT "maturities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maturities" ADD CONSTRAINT "maturities_processed_by_admins_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "maturities_user_id_idx" ON "maturities" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "maturities_idempotency_uid" ON "maturities" USING btree ("idempotency_key") WHERE "maturities"."idempotency_key" is not null;
