CREATE TABLE "meta_campaign_spend" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"import_id" uuid NOT NULL,
	"month" date NOT NULL,
	"meta_campaign_id" text,
	"campaign_name" text NOT NULL,
	"spend" numeric(12, 2) NOT NULL,
	"leads" integer
);
--> statement-breakpoint
ALTER TABLE "meta_campaign_spend" ADD CONSTRAINT "meta_campaign_spend_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meta_campaign_spend" ADD CONSTRAINT "meta_campaign_spend_import_id_revenue_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."revenue_imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "meta_campaign_spend_agency_month_idx" ON "meta_campaign_spend" USING btree ("agency_id","month");