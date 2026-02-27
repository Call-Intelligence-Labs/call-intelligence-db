-- Create sellers table
CREATE TABLE IF NOT EXISTS "sellers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "location_id" uuid NOT NULL REFERENCES "locations"("id") ON DELETE CASCADE,
  "ghl_user_id" text NOT NULL,
  "first_name" text,
  "last_name" text,
  "email" text,
  "phone" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Unique constraint for location + user
CREATE UNIQUE INDEX IF NOT EXISTS "unique_location_user" ON "sellers" ("location_id", "ghl_user_id");

-- Add seller_id to calls table
ALTER TABLE "calls" ADD COLUMN IF NOT EXISTS "seller_id" uuid REFERENCES "sellers"("id");

-- Index for sorting/filtering by seller
CREATE INDEX IF NOT EXISTS "idx_calls_seller_id" ON "calls" ("seller_id");
