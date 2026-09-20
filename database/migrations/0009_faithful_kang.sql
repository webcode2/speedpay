CREATE TABLE "investment_lots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"investment_id" uuid NOT NULL,
	"package_id" uuid NOT NULL,
	"lot_count" integer NOT NULL,
	"price_per_lot" text NOT NULL,
	"total_amount" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"package_id" uuid NOT NULL,
	"package_version_id" uuid,
	"principal" bigint NOT NULL,
	"lot_count" integer NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"maturity_at" timestamp with time zone NOT NULL,
	"return_type" text NOT NULL,
	"return_rate" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"idempotency_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "investment_lots" ADD CONSTRAINT "investment_lots_investment_id_investments_id_fk" FOREIGN KEY ("investment_id") REFERENCES "public"."investments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_lots" ADD CONSTRAINT "investment_lots_package_id_investment_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."investment_packages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investments" ADD CONSTRAINT "investments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investments" ADD CONSTRAINT "investments_package_id_investment_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."investment_packages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investments" ADD CONSTRAINT "investments_package_version_id_package_versions_id_fk" FOREIGN KEY ("package_version_id") REFERENCES "public"."package_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "investment_lots_investment_id_idx" ON "investment_lots" USING btree ("investment_id");--> statement-breakpoint
CREATE INDEX "investment_lots_package_id_idx" ON "investment_lots" USING btree ("package_id");--> statement-breakpoint
CREATE INDEX "investments_user_id_idx" ON "investments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "investments_package_id_idx" ON "investments" USING btree ("package_id");--> statement-breakpoint
CREATE INDEX "investments_status_idx" ON "investments" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "investments_user_idempotency_uid" ON "investments" USING btree ("user_id","idempotency_key") WHERE "investments"."idempotency_key" is not null;