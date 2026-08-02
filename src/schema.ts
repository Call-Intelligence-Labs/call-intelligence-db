import { pgTable, text, timestamp, boolean, integer, jsonb, uuid, numeric, date, uniqueIndex, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { and, eq, sql } from "drizzle-orm";

// -----------------------------------------------------------------------------
// 1. AGENCIES (Call centers / GHL Agencies)
// -----------------------------------------------------------------------------

export const agencies = pgTable("agencies", {
  id: uuid("id").defaultRandom().primaryKey(),

  name: text("name").notNull(),
  slug: text("slug").unique().notNull(), // For URL routing: /dashboard/agency-slug
  logoUrl: text("logo_url"),

  // Company context (used by AI for talking points & analysis)
  industry: text("industry"),                       // e.g. "Medical Aesthetics", "Dental", "Real Estate"
  companyDescription: text("company_description"),  // Elevator pitch about the company
  brandVoice: text("brand_voice"),                  // Tone/style guidance for AI output

  // Agency-level settings
  settings: jsonb("settings").$type<{
    defaultAiConfig?: {
      model?: string;
      temperature?: number;
    };
    notificationEmails?: string[];
    timezone?: string;
  }>(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// -----------------------------------------------------------------------------
// 2. LOCATIONS (GHL Sub-Accounts)
// -----------------------------------------------------------------------------

export const locations = pgTable("locations", {
  id: uuid("id").defaultRandom().primaryKey(),

  agencyId: uuid("agency_id").notNull().references(() => agencies.id, { onDelete: 'cascade' }),
  ghlLocationId: text("ghl_location_id").notNull().unique(), // The actual GHL Location ID

  name: text("name").notNull(),
  timezone: text("timezone").default("America/New_York"),
  isActive: boolean("is_active").default(true),

  // Location-specific settings (overrides agency settings)
  settings: jsonb("settings").$type<{
    aiConfig?: {
      model?: string;
      temperature?: number;
    };
    customPrompts?: {
      analysis?: string;
      summary?: string;
    };
  }>(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// -----------------------------------------------------------------------------
// 2b. OFFERS (Location-specific services/products for AI context)
// -----------------------------------------------------------------------------

export const offers = pgTable("offers", {
  id: uuid("id").defaultRandom().primaryKey(),

  locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: 'cascade' }),

  name: text("name").notNull(),                    // e.g. "Morpheus8 Consultation"
  description: text("description"),                // What the offer is
  pricing: text("pricing"),                        // Flexible: "$2,500", "Starting at $199/mo", "Free consultation"
  targetAudience: text("target_audience"),          // Who this is for
  sellingPoints: jsonb("selling_points").$type<string[]>(), // Key value propositions
  objectionResponses: jsonb("objection_responses").$type<{
    objection: string;
    response: string;
  }[]>(),                                          // Pre-loaded rebuttals

  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// -----------------------------------------------------------------------------
// 3. USERS (Linked to Google Identity Platform)
// -----------------------------------------------------------------------------

export const users = pgTable("users", {
  // This ID should match the 'uid' from Google Auth
  id: text("id").primaryKey(),

  email: text("email").notNull(), // Stored here for easy querying/display
  name: text("name"),

  // Legacy role - will be replaced by agency_members role
  role: text("role").default("user"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// -----------------------------------------------------------------------------
// 4. AGENCY MEMBERS (User-Agency relationships)
// -----------------------------------------------------------------------------

export const agencyMembers = pgTable("agency_members", {
  id: uuid("id").defaultRandom().primaryKey(),

  userId: text("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id, { onDelete: 'cascade' }),

  // Role within the agency
  role: text("role").notNull().default("member"), // 'owner', 'admin', 'member'

  // Permissions (optional granular permissions)
  permissions: jsonb("permissions").$type<{
    canViewCalls?: boolean;
    canManageIntegrations?: boolean;
    canManageBilling?: boolean;
    canManageTeam?: boolean;
  }>(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // One user can only have one membership per agency
  uniqueUserAgency: { columns: [table.userId, table.agencyId] },
}));

// -----------------------------------------------------------------------------
// 5. GHL INTEGRATION (OAuth & Private Integration API Key per Location)
// -----------------------------------------------------------------------------

export const ghlIntegrations = pgTable("ghl_integrations", {
  id: uuid("id").defaultRandom().primaryKey(),

  locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: 'cascade' }),

  // Auth type: 'oauth' for OAuth tokens, 'api_key' for Private Integration
  authType: text("auth_type").notNull().default('api_key'),

  // For both auth types: OAuth access token OR Private Integration API key
  accessToken: text("access_token").notNull(),

  // OAuth only (nullable for Private Integration)
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// -----------------------------------------------------------------------------
// 5b. WEBHOOK CONFIGS (Alternative to OAuth per Location)
// -----------------------------------------------------------------------------

export const webhookConfigs = pgTable("webhook_configs", {
  id: uuid("id").defaultRandom().primaryKey(),

  locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: 'cascade' }),
  webhookSecret: text("webhook_secret").notNull(), // For signature verification

  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// -----------------------------------------------------------------------------
// 5c. WEBHOOK LOGS (Audit trail for all incoming webhooks)
// -----------------------------------------------------------------------------

export const webhookLogs = pgTable("webhook_logs", {
  id: uuid("id").defaultRandom().primaryKey(),

  source: text("source").notNull(), // 'ghl' or other sources in future
  locationId: uuid("location_id").references(() => locations.id),

  // Payload and metadata
  payload: jsonb("payload").notNull(),
  headers: jsonb("headers"), // Store relevant headers for debugging

  // Processing status
  status: text("status").notNull().default("pending"), // 'pending', 'processing', 'completed', 'error'
  errorMessage: text("error_message"),

  // Links to related records once processed
  callId: uuid("call_id").references(() => calls.id),
  leadId: uuid("lead_id").references(() => leads.id),

  // Timestamps
  receivedAt: timestamp("received_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
});

// -----------------------------------------------------------------------------
// 5d. CAMPAIGNS (Marketing/ad campaigns that generate leads)
// -----------------------------------------------------------------------------
// Acquisition source for leads (e.g. a Meta ad campaign). Distinct from `offers`
// (what is being sold). Keyed on the stable platform campaign id; `name` is a
// mutable display label. Spend/status/targets can be added later.

export const campaigns = pgTable("campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),

  locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: 'cascade' }),
  ghlCampaignId: text("ghl_campaign_id").notNull(), // Stable platform campaign id (e.g. Meta campaignId)

  name: text("name"),       // Human-readable campaign name (mutable label)
  channel: text("channel"), // 'facebook' | 'google' | ... (from attribution source/medium)

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Unique constraint: one campaign per location
  uniqueLocationCampaign: { columns: [table.locationId, table.ghlCampaignId] },
}));

// Monthly ad spend per campaign (manually entered). Powers cost-per-booking.
export const campaignSpend = pgTable("campaign_spend", {
  id: uuid("id").defaultRandom().primaryKey(),

  campaignId: uuid("campaign_id").notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  month: date("month").notNull(),                              // first day of the spend month
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueCampaignMonth: { columns: [table.campaignId, table.month] },
}));

// -----------------------------------------------------------------------------
// 6. CACHED LEADS (Mirrors GHL Contacts)
// -----------------------------------------------------------------------------

export const leads = pgTable("leads", {
  id: uuid("id").defaultRandom().primaryKey(),

  locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: 'cascade' }),
  ghlContactId: text("ghl_contact_id").notNull(), // External ID from GHL

  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone"),
  tags: jsonb("tags").$type<string[]>(),

  // ── First-touch attribution (set immutably on insert; see ghl-processor upsertLead) ──
  ghlCreatedAt: timestamp("ghl_created_at", { withTimezone: true }), // GHL contact creation time (speed-to-lead clock start)
  campaignId: uuid("campaign_id").references(() => campaigns.id, { onDelete: 'set null' }),
  attribution: jsonb("attribution").$type<Record<string, unknown>>(), // Full contact.attributionSource snapshot
  adSetId: text("ad_set_id"),
  adId: text("ad_id"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  sessionSource: text("session_source"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Unique constraint: one contact per location
  uniqueLocationContact: { columns: [table.locationId, table.ghlContactId] },
}));

// -----------------------------------------------------------------------------
// 6b. SELLERS (GHL Users who make calls - mirrors GHL Users)
// -----------------------------------------------------------------------------

export const sellers = pgTable("sellers", {
  id: uuid("id").defaultRandom().primaryKey(),

  locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: 'cascade' }),
  ghlUserId: text("ghl_user_id").notNull(), // External ID from GHL

  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Unique constraint: one user per location
  uniqueLocationUser: { columns: [table.locationId, table.ghlUserId] },
}));

// -----------------------------------------------------------------------------
// 7. CALL INTELLIGENCE
// -----------------------------------------------------------------------------

export const calls = pgTable("calls", {
  id: uuid("id").defaultRandom().primaryKey(),

  locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: 'cascade' }),
  leadId: uuid("lead_id").references(() => leads.id),

  ghlCallId: text("ghl_call_id").unique(),
  sellerId: uuid("seller_id").references(() => sellers.id),
  direction: text("direction"),
  duration: integer("duration"),
  status: text("status"),

  audioUrl: text("audio_url"),
  recordingStatus: text("recording_status").default("pending"),

  // Webhook processing fields
  processingStatus: text("processing_status").default("received"), // "received", "analyzing", "completed", "error"
  rawWebhookPayload: jsonb("raw_webhook_payload"),
  errorMessage: text("error_message"),

  callAt: timestamp("call_at", { withTimezone: true }), // Actual call time (GHL message dateAdded), distinct from row createdAt

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const callAnalysis = pgTable("call_analysis", {
  id: uuid("id").defaultRandom().primaryKey(),
  callId: uuid("call_id").notNull().references(() => calls.id, { onDelete: 'cascade' }),

  // Raw transcript from AssemblyAI
  transcript: jsonb("transcript"),

  // ── Call Validity ──
  isValidProspect: boolean("is_valid_prospect"),
  invalidReason: text("invalid_reason"),       // enum: wrong_location, wrong_number, not_a_prospect, already_customer, spam_or_test, language_barrier, no_answer, other
  invalidReasonContext: text("invalid_reason_context"),

  // ── Outcome ──
  outcome: text("outcome"),                    // enum: booked, follow_up, declined, pending

  // ── Non-Booking Reason ──
  primaryNonBookingReason: text("primary_non_booking_reason"),  // enum: price, timing, needs_more_time, decision_maker_approval, scheduling_conflict, competitor_comparison, trust_concerns, value_uncertainty, not_ready, financing_issues, medical_concerns, other
  primaryNonBookingReasonContext: text("primary_non_booking_reason_context"),

  // ── Objections & Concerns (structured JSONB arrays) ──
  objections: jsonb("objections").$type<{
    category: string;
    resolved: boolean;
    context: string;
    resolution_context?: string | null;
  }[]>(),
  concerns: jsonb("concerns").$type<{
    type: 'expressed' | 'implied';
    category: string;
    addressed: boolean;
    context: string;
    addressed_context?: string | null;
  }[]>(),

  // ── Closing Behavior ──
  closingAttempted: boolean("closing_attempted"),
  closingTechnique: text("closing_technique"),   // enum: direct_ask, assumptive, alternative_choice, urgency_based, soft_suggestion, trial_close, none
  closingContext: text("closing_context"),

  // ── Seller Technique ──
  discoveryPerformed: boolean("discovery_performed"),
  discoveryContext: text("discovery_context"),
  valuePropositionPresented: boolean("value_proposition_presented"),
  valuePropositionContext: text("value_proposition_context"),
  urgencyCreated: boolean("urgency_created"),
  urgencyContext: text("urgency_context"),
  nextStepsEstablished: boolean("next_steps_established"),
  nextStepsContext: text("next_steps_context"),

  // ── Seller Demeanor (1-5 scale) ──
  sellerConfidence: integer("seller_confidence"),
  sellerEnthusiasm: integer("seller_enthusiasm"),
  sellerProfessionalism: integer("seller_professionalism"),
  sellerEmpathy: integer("seller_empathy"),

  // ── Prospect Behavior ──
  prospectEngagement: text("prospect_engagement"),  // enum: high, moderate, low

  // ── Talk Ratio (calculated from transcript, not AI) ──
  sellerTalkRatio: integer("seller_talk_ratio"),       // 0-100 percentage
  prospectTalkRatio: integer("prospect_talk_ratio"),   // 0-100 percentage

  // ── Summary ──
  summary: text("summary"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// -----------------------------------------------------------------------------
// 8. DIALER ACTIVITY (Tracks skip/complete actions on opportunities)
// -----------------------------------------------------------------------------

export const dialerActivity = pgTable("dialer_activity", {
  id: uuid("id").defaultRandom().primaryKey(),

  opportunityId: text("opportunity_id").notNull(),    // GHL opportunity ID (external)
  locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),

  action: text("action").notNull(),                   // 'called' | 'skipped'
  cooldownUntil: timestamp("cooldown_until").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// -----------------------------------------------------------------------------
// 9. AGENCY MEMBER LOCATIONS (Location-level access control)
// -----------------------------------------------------------------------------
// If a member has NO rows here → they see all locations in their agency.
// If a member has ANY rows here → they only see those specific locations.

export const agencyMemberLocations = pgTable("agency_member_locations", {
  id: uuid("id").defaultRandom().primaryKey(),

  agencyMemberId: uuid("agency_member_id").notNull()
    .references(() => agencyMembers.id, { onDelete: 'cascade' }),
  locationId: uuid("location_id").notNull()
    .references(() => locations.id, { onDelete: 'cascade' }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueMemberLocation: { columns: [table.agencyMemberId, table.locationId] },
}));

// -----------------------------------------------------------------------------
// 10. CALL LISTS (Saved lists of people to call)
// -----------------------------------------------------------------------------
// A generated, persisted set of people to work through. Follow-ups produces a list
// (e.g. "Should be called"), the dialer opens one and calls through it. Persisting these
// — instead of rebuilding a throwaway in-memory session each time — is what gives us call
// history and lets two people work the same list without colliding.

export const callLists = pgTable("call_lists", {
  id: uuid("id").defaultRandom().primaryKey(),

  locationId: uuid("location_id").notNull()
    .references(() => locations.id, { onDelete: 'cascade' }),

  name: text("name").notNull(),                        // "Should be called · Glendora · 22 Jul"
  source: text("source").notNull(),                    // 'followups' | 'dialer_scan' | 'manual'
  status: text("status").notNull().default("active"),  // 'active' | 'completed' | 'archived'

  // users.id is the Google Auth uid (text), not a uuid.
  createdByUserId: text("created_by_user_id")
    .references(() => users.id, { onDelete: 'set null' }),
  meta: jsonb("meta").$type<Record<string, unknown>>(), // filters/window used, so it's reproducible

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const callListItems = pgTable("call_list_items", {
  id: uuid("id").defaultRandom().primaryKey(),

  listId: uuid("list_id").notNull()
    .references(() => callLists.id, { onDelete: 'cascade' }),

  // External GHL contact id, deliberately NOT a FK to `leads`: SMS-only leads frequently have
  // no leads row, and those are exactly the ones follow-ups surfaces. `leadId` links when we
  // happen to have one.
  ghlContactId: text("ghl_contact_id").notNull(),
  leadId: uuid("lead_id").references(() => leads.id, { onDelete: 'set null' }),

  name: text("name"),
  phone: text("phone"),
  reason: text("reason"),                              // why they're on the list (the hook)
  talkingPoints: jsonb("talking_points").$type<string[]>(),
  score: integer("score"),                             // conversion score at generation time

  position: integer("position").notNull().default(0),  // rank when the list was generated
  status: text("status").notNull().default("pending"), // 'pending' | 'called' | 'skipped'
  outcome: text("outcome"),
  calledAt: timestamp("called_at"),
  calledByUserId: text("called_by_user_id")   // users.id is the Google Auth uid (text)
    .references(() => users.id, { onDelete: 'set null' }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // A contact can't appear twice on the same list (guards against a double push).
  uniqueListContact: uniqueIndex("call_list_items_list_contact_idx")
    .on(table.listId, table.ghlContactId),
}));

// -----------------------------------------------------------------------------
// 10b. FOLLOW-UP REPORTS
// -----------------------------------------------------------------------------

// A saved follow-up report: the params that produced it plus the result. Doubles as the job row for
// background generation — a report is enqueued (status='queued', result=null), a worker runs it
// (status='running' → 'done' with a result, or 'error'), and the client polls. Scoped to the agency
// and the user who ran it (per-creator visibility; the worker rebuilds that user from createdByUserId
// since it has no Firebase token).
//
// Unlike call_list_items, the result is stored as a JSONB blob rather than normalized rows: a report
// is a read-only snapshot consumed whole, and its threads carry heterogeneous per-view fields
// (strengths/issues/coaching for "bad"; signals/talkingPoints/score for opportunities). Nothing
// queries a single thread out of a report, so normalizing would be churn for no benefit.
export const followupReports = pgTable("followup_reports", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Reports can span "all" locations, so scope is the agency, not a single location FK.
  agencyId: uuid("agency_id").notNull()
    .references(() => agencies.id, { onDelete: 'cascade' }),

  // users.id is the Google Auth uid (text), not a uuid — matches call_lists.
  createdByUserId: text("created_by_user_id").notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  view: text("view").notNull(),               // 'ignored' | 'bad' | 'opportunities'
  locationId: text("location_id").notNull(),  // "all" or a location UUID — text, not an FK
  locationName: text("location_name").notNull(),

  windowFrom: timestamp("window_from").notNull(),
  windowTo: timestamp("window_to").notNull(),
  waitingHours: integer("waiting_hours"),

  // Job lifecycle. A row is created 'queued' with no result; the worker fills result + flips to
  // 'done', or records error + flips to 'error'.
  status: text("status").notNull().default("queued"), // 'queued' | 'running' | 'done' | 'error'
  error: text("error"),

  // The full FollowupsResponse (generatedAt, summary, threads, scannedCount, …). Null until 'done'.
  result: jsonb("result").$type<Record<string, unknown>>(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(), // for polling / stuck-job detection
}, (table) => ({
  // The list query is "this user's reports, newest first".
  byUser: index("followup_reports_user_idx").on(table.createdByUserId, table.createdAt),
}));

// -----------------------------------------------------------------------------
// Problem reports — in-app "report a problem" submissions from users, read by admins.
// Deliberately simple: a body, who sent it, which agency they were in, and a resolve flag.
// -----------------------------------------------------------------------------
// One comment on a problem report. Stored as a JSONB array on the report (low volume, always
// fetched with the ticket), so no separate table. `isStaff` marks an admin/support reply vs the
// reporter's own message.
export type ProblemReportComment = {
  id: string;
  authorUserId: string;
  authorEmail: string | null;
  isStaff: boolean;
  body: string;
  createdAt: string; // ISO
};

export const problemReports = pgTable("problem_reports", {
  id: uuid("id").defaultRandom().primaryKey(),

  // users.id is the Google Auth uid (text), not a uuid — matches followup_reports/call_lists.
  reporterUserId: text("reporter_user_id").notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  reporterEmail: text("reporter_email"),

  // Which agency they were working in when they reported (context; kept if the agency is deleted).
  agencyId: uuid("agency_id").references(() => agencies.id, { onDelete: 'set null' }),

  body: text("body").notNull(),
  // Optional "where I was" context the client attaches (e.g. the page path) to aid triage.
  pageContext: text("page_context"),

  status: text("status").notNull().default("open"), // 'open' | 'resolved'

  // The two-way comment thread (reporter + admin/support). See ProblemReportComment.
  comments: jsonb("comments").$type<ProblemReportComment[]>().default(sql`'[]'::jsonb`).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
}, (table) => ({
  // The admin list query is "newest open first".
  byStatus: index("problem_reports_status_idx").on(table.status, table.createdAt),
}));

// -----------------------------------------------------------------------------
// 11. RELATIONS
// -----------------------------------------------------------------------------

// Agency relations
export const agencyRelations = relations(agencies, ({ many }) => ({
  locations: many(locations),
  members: many(agencyMembers),
}));

// Location relations
export const locationRelations = relations(locations, ({ one, many }) => ({
  agency: one(agencies, { fields: [locations.agencyId], references: [agencies.id] }),
  ghlIntegration: one(ghlIntegrations),
  webhookConfig: one(webhookConfigs),
  offers: many(offers),
  leads: many(leads),
  calls: many(calls),
  campaigns: many(campaigns),
  dialerActivity: many(dialerActivity),
  callLists: many(callLists),
}));

// Call list relations
export const callListRelations = relations(callLists, ({ one, many }) => ({
  location: one(locations, { fields: [callLists.locationId], references: [locations.id] }),
  createdBy: one(users, { fields: [callLists.createdByUserId], references: [users.id] }),
  items: many(callListItems),
}));

export const callListItemRelations = relations(callListItems, ({ one }) => ({
  list: one(callLists, { fields: [callListItems.listId], references: [callLists.id] }),
  lead: one(leads, { fields: [callListItems.leadId], references: [leads.id] }),
  calledBy: one(users, { fields: [callListItems.calledByUserId], references: [users.id] }),
}));

// Follow-up report relations
export const followupReportRelations = relations(followupReports, ({ one }) => ({
  agency: one(agencies, { fields: [followupReports.agencyId], references: [agencies.id] }),
  createdBy: one(users, { fields: [followupReports.createdByUserId], references: [users.id] }),
}));

// Problem report relations
export const problemReportRelations = relations(problemReports, ({ one }) => ({
  reporter: one(users, { fields: [problemReports.reporterUserId], references: [users.id] }),
  agency: one(agencies, { fields: [problemReports.agencyId], references: [agencies.id] }),
}));

// Offer relations
export const offerRelations = relations(offers, ({ one }) => ({
  location: one(locations, { fields: [offers.locationId], references: [locations.id] }),
}));

// User relations
export const userRelations = relations(users, ({ many }) => ({
  agencyMemberships: many(agencyMembers),
}));

// Agency member relations
export const agencyMemberRelations = relations(agencyMembers, ({ one, many }) => ({
  user: one(users, { fields: [agencyMembers.userId], references: [users.id] }),
  agency: one(agencies, { fields: [agencyMembers.agencyId], references: [agencies.id] }),
  locationAccess: many(agencyMemberLocations),
}));

// Agency member location relations
export const agencyMemberLocationRelations = relations(agencyMemberLocations, ({ one }) => ({
  member: one(agencyMembers, { fields: [agencyMemberLocations.agencyMemberId], references: [agencyMembers.id] }),
  location: one(locations, { fields: [agencyMemberLocations.locationId], references: [locations.id] }),
}));

// GHL Integration relations
export const integrationRelations = relations(ghlIntegrations, ({ one }) => ({
  location: one(locations, { fields: [ghlIntegrations.locationId], references: [locations.id] }),
}));

// Webhook Config relations
export const webhookConfigRelations = relations(webhookConfigs, ({ one }) => ({
  location: one(locations, { fields: [webhookConfigs.locationId], references: [locations.id] }),
}));

// Leads relations
export const leadsRelations = relations(leads, ({ one, many }) => ({
  location: one(locations, { fields: [leads.locationId], references: [locations.id] }),
  campaign: one(campaigns, { fields: [leads.campaignId], references: [campaigns.id] }),
  calls: many(calls),
}));

// Campaign relations
export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  location: one(locations, { fields: [campaigns.locationId], references: [locations.id] }),
  leads: many(leads),
  spend: many(campaignSpend),
}));

// Campaign spend relations
export const campaignSpendRelations = relations(campaignSpend, ({ one }) => ({
  campaign: one(campaigns, { fields: [campaignSpend.campaignId], references: [campaigns.id] }),
}));

// Sellers relations
export const sellersRelations = relations(sellers, ({ one, many }) => ({
  location: one(locations, { fields: [sellers.locationId], references: [locations.id] }),
  calls: many(calls),
}));

// Calls relations
export const callsRelations = relations(calls, ({ one }) => ({
  location: one(locations, { fields: [calls.locationId], references: [locations.id] }),
  lead: one(leads, { fields: [calls.leadId], references: [leads.id] }),
  seller: one(sellers, { fields: [calls.sellerId], references: [sellers.id] }),
  analysis: one(callAnalysis, { fields: [calls.id], references: [callAnalysis.callId] }),
}));

// Call Analysis relations
export const analysisRelations = relations(callAnalysis, ({ one }) => ({
  call: one(calls, { fields: [callAnalysis.callId], references: [calls.id] }),
}));

// Webhook Logs relations
export const webhookLogsRelations = relations(webhookLogs, ({ one }) => ({
  location: one(locations, { fields: [webhookLogs.locationId], references: [locations.id] }),
  call: one(calls, { fields: [webhookLogs.callId], references: [calls.id] }),
  lead: one(leads, { fields: [webhookLogs.leadId], references: [leads.id] }),
}));

// Dialer Activity relations
export const dialerActivityRelations = relations(dialerActivity, ({ one }) => ({
  location: one(locations, { fields: [dialerActivity.locationId], references: [locations.id] }),
}));
