-- 0005: campaigns table + first-touch attribution on leads + call_at on calls
-- Additive & idempotent (safe to re-run). Applied to Neon dev directly via psql.

CREATE TABLE IF NOT EXISTS "campaigns" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
  "location_id" uuid NOT NULL,
  "ghl_campaign_id" text NOT NULL,
  "name" text,
  "channel" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "campaigns_location_id_fk"
    FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "campaigns_location_id_ghl_campaign_id_unique"
  ON "campaigns" ("location_id", "ghl_campaign_id");
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "ghl_created_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "campaign_id" uuid;
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "attribution" jsonb;
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "ad_set_id" text;
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "ad_id" text;
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "utm_source" text;
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "utm_medium" text;
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "session_source" text;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "leads" ADD CONSTRAINT "leads_campaign_id_campaigns_id_fk"
    FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "call_at" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leads_location_id_campaign_id_idx" ON "leads" ("location_id", "campaign_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calls_seller_id_idx" ON "calls" ("seller_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calls_created_at_idx" ON "calls" ("created_at");
