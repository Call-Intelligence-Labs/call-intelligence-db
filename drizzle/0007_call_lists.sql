-- Saved call lists: a generated, persisted set of people to work through.
-- Follow-ups produces a list; the dialer opens one and calls through it.
-- Additive only — creates two new tables, touches nothing existing.

CREATE TABLE IF NOT EXISTS "call_lists" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
  "location_id" uuid NOT NULL,
  "name" text NOT NULL,
  "source" text NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "created_by_user_id" text,
  "meta" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "call_lists_location_id_fk"
    FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE cascade,
  CONSTRAINT "call_lists_created_by_user_id_fk"
    FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE set null
);

CREATE TABLE IF NOT EXISTS "call_list_items" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
  "list_id" uuid NOT NULL,
  -- External GHL contact id, deliberately NOT a FK: SMS-only leads often have no leads row.
  "ghl_contact_id" text NOT NULL,
  "lead_id" uuid,
  "name" text,
  "phone" text,
  "reason" text,
  "talking_points" jsonb,
  "score" integer,
  "position" integer DEFAULT 0 NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "outcome" text,
  "called_at" timestamp,
  "called_by_user_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "call_list_items_list_id_fk"
    FOREIGN KEY ("list_id") REFERENCES "call_lists"("id") ON DELETE cascade,
  CONSTRAINT "call_list_items_lead_id_fk"
    FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE set null,
  CONSTRAINT "call_list_items_called_by_user_id_fk"
    FOREIGN KEY ("called_by_user_id") REFERENCES "users"("id") ON DELETE set null
);

-- A contact can't appear twice on the same list (guards against a double push).
CREATE UNIQUE INDEX IF NOT EXISTS "call_list_items_list_contact_idx"
  ON "call_list_items" ("list_id", "ghl_contact_id");

-- Lookup paths we'll actually use: lists for a location, items for a list.
CREATE INDEX IF NOT EXISTS "call_lists_location_idx" ON "call_lists" ("location_id");
CREATE INDEX IF NOT EXISTS "call_list_items_list_idx" ON "call_list_items" ("list_id");
