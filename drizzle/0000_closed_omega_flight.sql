-- Add new webhook_configs table
CREATE TABLE IF NOT EXISTS "webhook_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"ghl_location_id" text NOT NULL,
	"webhook_secret" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_configs_ghl_location_id_unique" UNIQUE("ghl_location_id")
);
--> statement-breakpoint

-- Add foreign key for webhook_configs
ALTER TABLE "webhook_configs" ADD CONSTRAINT "webhook_configs_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Add new columns to existing calls table
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "processing_status" text DEFAULT 'received';
--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "raw_webhook_payload" jsonb;
--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "error_message" text;