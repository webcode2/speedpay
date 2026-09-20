CREATE TABLE "investment_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"lot_price" text NOT NULL,
	"total_lots" integer NOT NULL,
	"reserved_lots" integer DEFAULT 0 NOT NULL,
	"sold_lots" integer DEFAULT 0 NOT NULL,
	"minimum_lots" integer DEFAULT 1 NOT NULL,
	"maximum_lots" integer,
	"return_type" text NOT NULL,
	"return_rate" text NOT NULL,
	"duration_days" integer NOT NULL,
	"available_from" timestamp with time zone,
	"available_until" timestamp with time zone,
	"current_version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "package_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"lot_price" text NOT NULL,
	"return_type" text NOT NULL,
	"return_rate" text NOT NULL,
	"duration_days" integer NOT NULL,
	"terms" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "investment_packages" ADD CONSTRAINT "investment_packages_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_versions" ADD CONSTRAINT "package_versions_package_id_investment_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."investment_packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "investment_packages_project_id_idx" ON "investment_packages" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "investment_packages_status_idx" ON "investment_packages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "package_versions_package_id_idx" ON "package_versions" USING btree ("package_id");