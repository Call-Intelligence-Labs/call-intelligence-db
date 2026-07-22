-- 0006: campaign_spend — monthly ad spend per campaign (manual entry, for cost-per-booking)
-- Additive & idempotent.

CREATE TABLE IF NOT EXISTS "campaign_spend" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
  "campaign_id" uuid NOT NULL,
  "month" date NOT NULL,
  "amount" numeric(12, 2) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "campaign_spend_campaign_id_fk"
    FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "campaign_spend_campaign_id_month_unique"
  ON "campaign_spend" ("campaign_id", "month");
