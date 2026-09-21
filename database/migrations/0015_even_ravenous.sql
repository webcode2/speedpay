CREATE TABLE "platform_payment_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"label" text NOT NULL,
	"account_name" text NOT NULL,
	"account_number" text NOT NULL,
	"bank_name" text,
	"provider" text,
	"notes" text,
	"status" text DEFAULT 'DISABLED' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "investment_packages" ADD COLUMN "banner_image" text;--> statement-breakpoint
CREATE INDEX "platform_payment_accounts_status_idx" ON "platform_payment_accounts" USING btree ("status");
