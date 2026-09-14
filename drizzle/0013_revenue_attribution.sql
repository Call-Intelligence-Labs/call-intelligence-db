CREATE TABLE "bizzflo_appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"import_id" uuid NOT NULL,
	"customer_name" text,
	"customer_email" text,
	"status" text NOT NULL,
	"service" text NOT NULL,
	"date" date NOT NULL,
	"time" text
);
--> statement-breakpoint
CREATE TABLE "bizzflo_sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"import_id" uuid NOT NULL,
	"invoice" text NOT NULL,
	"date" date NOT NULL,
	"customer_name" text,
	"customer_email" text,
	"type" text,
	"item" text NOT NULL,
	"sales_clerk" text,
	"commission_clerk" text,
	"total" numeric(12, 2) NOT NULL,
	"refund_amount" numeric(12, 2) NOT NULL,
	"net_total" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revenue_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"location_id" uuid,
	"kind" text NOT NULL,
	"file_name" text NOT NULL,
	"covered_from" date,
	"covered_to" date,
	"row_count" integer NOT NULL,
	"totals" jsonb,
	"uploaded_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stripe_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"agency_id" uuid NOT NULL,
	"location_id" uuid,
	"import_id" uuid NOT NULL,
	"charged_at" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"amount_refunded" numeric(12, 2) NOT NULL,
	"description" text,
	"customer_email" text,
	"ghl_contact_id" text
);
--> statement-breakpoint
ALTER TABLE "bizzflo_appointments" ADD CONSTRAINT "bizzflo_appointments_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bizzflo_appointments" ADD CONSTRAINT "bizzflo_appointments_import_id_revenue_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."revenue_imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bizzflo_sales" ADD CONSTRAINT "bizzflo_sales_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bizzflo_sales" ADD CONSTRAINT "bizzflo_sales_import_id_revenue_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."revenue_imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_imports" ADD CONSTRAINT "revenue_imports_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_imports" ADD CONSTRAINT "revenue_imports_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revenue_imports" ADD CONSTRAINT "revenue_imports_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stripe_payments" ADD CONSTRAINT "stripe_payments_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stripe_payments" ADD CONSTRAINT "stripe_payments_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stripe_payments" ADD CONSTRAINT "stripe_payments_import_id_revenue_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."revenue_imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bizzflo_appointments_location_date_idx" ON "bizzflo_appointments" USING btree ("location_id","date");--> statement-breakpoint
CREATE INDEX "bizzflo_sales_location_date_idx" ON "bizzflo_sales" USING btree ("location_id","date");--> statement-breakpoint
CREATE INDEX "revenue_imports_location_kind_idx" ON "revenue_imports" USING btree ("location_id","kind","created_at");--> statement-breakpoint
CREATE INDEX "stripe_payments_location_charged_idx" ON "stripe_payments" USING btree ("location_id","charged_at");