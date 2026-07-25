CREATE TABLE "followup_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"created_by_user_id" text NOT NULL,
	"view" text NOT NULL,
	"location_id" text NOT NULL,
	"location_name" text NOT NULL,
	"window_from" timestamp NOT NULL,
	"window_to" timestamp NOT NULL,
	"waiting_hours" integer,
	"result" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "followup_reports" ADD CONSTRAINT "followup_reports_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "followup_reports" ADD CONSTRAINT "followup_reports_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "followup_reports_user_idx" ON "followup_reports" USING btree ("created_by_user_id","created_at");