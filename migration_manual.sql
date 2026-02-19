-- Manual migration for ghl_integrations table
-- Run this in your database

-- 1. Add auth_type column with default 'api_key'
ALTER TABLE "ghl_integrations" ADD COLUMN IF NOT EXISTS "auth_type" text DEFAULT 'api_key' NOT NULL;

-- 2. Make refresh_token nullable (for Private Integration)
ALTER TABLE "ghl_integrations" ALTER COLUMN "refresh_token" DROP NOT NULL;

-- 3. Make expires_at nullable (for Private Integration)
ALTER TABLE "ghl_integrations" ALTER COLUMN "expires_at" DROP NOT NULL;
