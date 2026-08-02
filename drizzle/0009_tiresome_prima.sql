ALTER TABLE "followup_reports" ALTER COLUMN "result" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "followup_reports" ADD COLUMN "status" text DEFAULT 'queued' NOT NULL;--> statement-breakpoint
ALTER TABLE "followup_reports" ADD COLUMN "error" text;--> statement-breakpoint
ALTER TABLE "followup_reports" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
-- Existing rows predate background jobs: they already have a result, so they're done, not queued.
UPDATE "followup_reports" SET "status" = 'done' WHERE "result" IS NOT NULL;