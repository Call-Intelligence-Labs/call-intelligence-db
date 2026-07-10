-- One-time backfill of first-touch attribution + timestamps from stored webhook
-- payloads (calls.raw_webhook_payload), for calls ingested before the attribution
-- pipeline shipped. Idempotent: only fills NULLs, never overwrites ingested values.
--
-- Run 2026-07-10 against the dev/prod Neon DB: 16 campaigns, 1,936 leads, 2,816 calls.
-- Populates: leads.ghl_created_at / campaign_id / attribution / utm_* / ad_*,
-- the campaigns table, and (approximate) calls.call_at = created_at for the backlog.
--
-- Apply: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/backfill-attribution.sql

BEGIN;

-- 1) Campaigns from first-touch attribution (earliest call payload per lead).
INSERT INTO campaigns (location_id, ghl_campaign_id, name, channel)
SELECT fp.location_id, fp.campaign_id, MAX(fp.campaign_name), MAX(fp.channel)
FROM (
  SELECT DISTINCT ON (c.lead_id)
    c.lead_id,
    c.location_id,
    c.raw_webhook_payload -> 'contact' -> 'attributionSource' ->> 'campaignId' AS campaign_id,
    c.raw_webhook_payload -> 'contact' -> 'attributionSource' ->> 'campaign'   AS campaign_name,
    COALESCE(
      c.raw_webhook_payload -> 'contact' -> 'attributionSource' ->> 'source',
      c.raw_webhook_payload -> 'contact' -> 'attributionSource' ->> 'medium'
    ) AS channel
  FROM calls c
  WHERE c.lead_id IS NOT NULL AND c.raw_webhook_payload IS NOT NULL
  ORDER BY c.lead_id, c.created_at ASC
) fp
WHERE fp.campaign_id IS NOT NULL
GROUP BY fp.location_id, fp.campaign_id
ON CONFLICT (location_id, ghl_campaign_id) DO NOTHING;

-- 2) Lead attribution + ghl_created_at (fill nulls only).
WITH fp AS (
  SELECT DISTINCT ON (c.lead_id)
    c.lead_id,
    c.location_id,
    NULLIF(c.raw_webhook_payload ->> 'date_created', '') AS date_created,
    c.raw_webhook_payload -> 'contact' -> 'attributionSource' AS attr
  FROM calls c
  WHERE c.lead_id IS NOT NULL AND c.raw_webhook_payload IS NOT NULL
  ORDER BY c.lead_id, c.created_at ASC
)
UPDATE leads l SET
  ghl_created_at = COALESCE(l.ghl_created_at, fp.date_created::timestamptz),
  attribution    = COALESCE(l.attribution, NULLIF(fp.attr, '{}'::jsonb)),
  campaign_id    = COALESCE(l.campaign_id, cm.id),
  ad_set_id      = COALESCE(l.ad_set_id, fp.attr ->> 'adSetId'),
  ad_id          = COALESCE(l.ad_id, fp.attr ->> 'adId'),
  utm_source     = COALESCE(l.utm_source, fp.attr ->> 'utmSource'),
  utm_medium     = COALESCE(l.utm_medium, fp.attr ->> 'utmMedium'),
  session_source = COALESCE(l.session_source, fp.attr ->> 'sessionSource')
FROM fp
LEFT JOIN campaigns cm
  ON cm.location_id = fp.location_id
 AND cm.ghl_campaign_id = (fp.attr ->> 'campaignId')
WHERE l.id = fp.lead_id;

-- 3) Approximate historical call_at with the row's created_at (fill nulls only).
--    New calls get the exact dateAdded from ingestion; this only affects the backlog.
UPDATE calls SET call_at = created_at WHERE call_at IS NULL;

COMMIT;
