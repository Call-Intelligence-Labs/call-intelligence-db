CREATE TABLE IF NOT EXISTS "agency_member_locations" (
  "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY NOT NULL,
  "agency_member_id" uuid NOT NULL,
  "location_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "agency_member_locations_agency_member_id_fk"
    FOREIGN KEY ("agency_member_id") REFERENCES "agency_members"("id") ON DELETE cascade,
  CONSTRAINT "agency_member_locations_location_id_fk"
    FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE cascade,
  CONSTRAINT "agency_member_locations_agency_member_id_location_id_unique"
    UNIQUE("agency_member_id", "location_id")
);
