CREATE TABLE "problem_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_user_id" text NOT NULL,
	"reporter_email" text,
	"agency_id" uuid,
	"body" text NOT NULL,
	"page_context" text,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "problem_reports" ADD CONSTRAINT "problem_reports_reporter_user_id_users_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problem_reports" ADD CONSTRAINT "problem_reports_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "problem_reports_status_idx" ON "problem_reports" USING btree ("status","created_at");