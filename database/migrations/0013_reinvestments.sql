ALTER TABLE "investments" ADD COLUMN "parent_investment_id" uuid;--> statement-breakpoint
CREATE TABLE "reinvestments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_investment_id" uuid NOT NULL,
	"new_investment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"idempotency_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reinvestments_new_investment_id_unique" UNIQUE("new_investment_id")
);
--> statement-breakpoint
ALTER TABLE "investments" ADD CONSTRAINT "investments_parent_investment_id_investments_id_fk" FOREIGN KEY ("parent_investment_id") REFERENCES "public"."investments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reinvestments" ADD CONSTRAINT "reinvestments_parent_investment_id_investments_id_fk" FOREIGN KEY ("parent_investment_id") REFERENCES "public"."investments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reinvestments" ADD CONSTRAINT "reinvestments_new_investment_id_investments_id_fk" FOREIGN KEY ("new_investment_id") REFERENCES "public"."investments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reinvestments" ADD CONSTRAINT "reinvestments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "investments_parent_id_idx" ON "investments" USING btree ("parent_investment_id");--> statement-breakpoint
CREATE INDEX "reinvestments_parent_id_idx" ON "reinvestments" USING btree ("parent_investment_id");--> statement-breakpoint
CREATE INDEX "reinvestments_user_id_idx" ON "reinvestments" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reinvestments_user_idempotency_uid" ON "reinvestments" USING btree ("user_id","idempotency_key") WHERE "reinvestments"."idempotency_key" is not null;
