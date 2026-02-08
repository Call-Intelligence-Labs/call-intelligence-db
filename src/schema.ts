import { pgTable, text, timestamp, boolean, integer, jsonb, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// -----------------------------------------------------------------------------
// 1. USERS (Linked to Google Identity Platform)
// -----------------------------------------------------------------------------

export const users = pgTable("users", {
  // This ID should match the 'uid' from Google Auth
  id: text("id").primaryKey(),

  email: text("email").notNull(), // Stored here for easy querying/display
  name: text("name"),

  // Role management (handled by our app, not Google)
  role: text("role").default("user"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// -----------------------------------------------------------------------------
// 2. GHL INTEGRATION (OAuth & Config)
// -----------------------------------------------------------------------------

export const ghlIntegrations = pgTable("ghl_integrations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id), // Owner

  locationId: text("location_id").notNull().unique(), // GHL Location ID
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// -----------------------------------------------------------------------------
// 2b. WEBHOOK CONFIGS (Alternative to OAuth)
// -----------------------------------------------------------------------------

export const webhookConfigs = pgTable("webhook_configs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),

  ghlLocationId: text("ghl_location_id").notNull().unique(),
  webhookSecret: text("webhook_secret").notNull(), // For signature verification
  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// -----------------------------------------------------------------------------
// 3. CACHED LEADS (Mirrors GHL Contacts)
// -----------------------------------------------------------------------------

export const leads = pgTable("leads", {
  id: uuid("id").defaultRandom().primaryKey(),

  ghlLocationId: text("ghl_location_id").notNull(),
  ghlContactId: text("ghl_contact_id").notNull(), // External ID from GHL

  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone"),
  tags: jsonb("tags").$type<string[]>(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// -----------------------------------------------------------------------------
// 4. CALL INTELLIGENCE
// -----------------------------------------------------------------------------

export const calls = pgTable("calls", {
  id: uuid("id").defaultRandom().primaryKey(),

  leadId: uuid("lead_id").references(() => leads.id),
  ghlLocationId: text("ghl_location_id").notNull(),

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
// 5. RELATIONS
// -----------------------------------------------------------------------------

export const userRelations = relations(users, ({ many }) => ({
  integrations: many(ghlIntegrations),
  webhookConfigs: many(webhookConfigs),
}));

export const integrationRelations = relations(ghlIntegrations, ({ one }) => ({
  user: one(users, { fields: [ghlIntegrations.userId], references: [users.id] }),
}));

export const webhookConfigRelations = relations(webhookConfigs, ({ one }) => ({
  user: one(users, { fields: [webhookConfigs.userId], references: [users.id] }),
}));

export const leadsRelations = relations(leads, ({ many }) => ({
  calls: many(calls),
}));

export const callsRelations = relations(calls, ({ one }) => ({
  lead: one(leads, { fields: [calls.leadId], references: [leads.id] }),
  analysis: one(callAnalysis, { fields: [calls.id], references: [callAnalysis.callId] }),
}));

export const analysisRelations = relations(callAnalysis, ({ one }) => ({
  call: one(calls, { fields: [callAnalysis.callId], references: [calls.id] }),
}));
