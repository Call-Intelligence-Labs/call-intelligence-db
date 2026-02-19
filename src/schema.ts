import { pgTable, text, timestamp, boolean, integer, jsonb, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// -----------------------------------------------------------------------------
// 1. AGENCIES (Call centers / GHL Agencies)
// -----------------------------------------------------------------------------

export const agencies = pgTable("agencies", {
  id: uuid("id").defaultRandom().primaryKey(),

  name: text("name").notNull(),
  slug: text("slug").unique().notNull(), // For URL routing: /dashboard/agency-slug
  logoUrl: text("logo_url"),

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

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Unique constraint: one contact per location
  uniqueLocationContact: { columns: [table.locationId, table.ghlContactId] },
}));

// -----------------------------------------------------------------------------
// 7. CALL INTELLIGENCE
// -----------------------------------------------------------------------------

export const calls = pgTable("calls", {
  id: uuid("id").defaultRandom().primaryKey(),

  locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: 'cascade' }),
  leadId: uuid("lead_id").references(() => leads.id),

  ghlCallId: text("ghl_call_id").unique(),
  direction: text("direction"),
  duration: integer("duration"),
  status: text("status"),

  audioUrl: text("audio_url"),
  recordingStatus: text("recording_status").default("pending"),

  // Webhook processing fields
  processingStatus: text("processing_status").default("received"), // "received", "analyzing", "completed", "error"
  rawWebhookPayload: jsonb("raw_webhook_payload"),
  errorMessage: text("error_message"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const callAnalysis = pgTable("call_analysis", {
  id: uuid("id").defaultRandom().primaryKey(),
  callId: uuid("call_id").notNull().references(() => calls.id, { onDelete: 'cascade' }),

  summary: text("summary"),
  sentimentScore: integer("sentiment_score"),
  transcript: jsonb("transcript"),

  objections: jsonb("objections").$type<string[]>(),
  coachingPoints: jsonb("coaching_points").$type<string[]>(),
  actionItems: jsonb("action_items").$type<{ task: string; priority: string }[]>(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// -----------------------------------------------------------------------------
// 8. RELATIONS
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
  leads: many(leads),
  calls: many(calls),
}));

// User relations
export const userRelations = relations(users, ({ many }) => ({
  agencyMemberships: many(agencyMembers),
}));

// Agency member relations
export const agencyMemberRelations = relations(agencyMembers, ({ one }) => ({
  user: one(users, { fields: [agencyMembers.userId], references: [users.id] }),
  agency: one(agencies, { fields: [agencyMembers.agencyId], references: [agencies.id] }),
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
  calls: many(calls),
}));

// Calls relations
export const callsRelations = relations(calls, ({ one }) => ({
  location: one(locations, { fields: [calls.locationId], references: [locations.id] }),
  lead: one(leads, { fields: [calls.leadId], references: [leads.id] }),
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
