/**
 * EconChat Database Schema
 * Using Drizzle ORM with PostgreSQL
 */

import { pgTable, text, timestamp, integer, boolean, decimal, uuid, pgEnum, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'USER', 'BETA_TESTER']);
export const userStatusEnum = pgEnum('user_status', ['ACTIVE', 'SUSPENDED', 'PENDING']);
export const waitlistStatusEnum = pgEnum('waitlist_status', ['PENDING', 'APPROVED', 'REJECTED']);
export const tierEnum = pgEnum('tier', ['TIER1', 'TIER2']);

// Users table - synced from Clerk
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkId: text('clerk_id').unique().notNull(),
  email: text('email').unique().notNull(),
  name: text('name'),
  imageUrl: text('image_url'),
  role: userRoleEnum('role').default('USER').notNull(),
  status: userStatusEnum('status').default('PENDING').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastLoginAt: timestamp('last_login_at'),
}, (table) => ({
  clerkIdIdx: index('users_clerk_id_idx').on(table.clerkId),
  emailIdx: index('users_email_idx').on(table.email),
  roleIdx: index('users_role_idx').on(table.role),
  statusIdx: index('users_status_idx').on(table.status),
}));

// User limits - per-user query limits and tier access
export const userLimits = pgTable('user_limits', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).unique().notNull(),
  dailyQueryLimit: integer('daily_query_limit').default(50).notNull(),
  monthlyQueryLimit: integer('monthly_query_limit').default(1000).notNull(),
  dailyQueriesUsed: integer('daily_queries_used').default(0).notNull(),
  monthlyQueriesUsed: integer('monthly_queries_used').default(0).notNull(),
  tier1Access: boolean('tier1_access').default(false).notNull(), // Claude Opus
  tier2Access: boolean('tier2_access').default(true).notNull(),  // Gemini Flash
  lastResetDaily: timestamp('last_reset_daily').defaultNow().notNull(),
  lastResetMonthly: timestamp('last_reset_monthly').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_limits_user_id_idx').on(table.userId),
}));

// Usage logs - track every query
export const usageLogs = pgTable('usage_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  sessionId: text('session_id'),
  query: text('query').notNull(),
  tier: tierEnum('tier').notNull(),
  model: text('model').notNull(),
  inputTokens: integer('input_tokens').default(0).notNull(),
  outputTokens: integer('output_tokens').default(0).notNull(),
  cost: decimal('cost', { precision: 10, scale: 6 }).default('0').notNull(),
  responseTimeMs: integer('response_time_ms'),
  success: boolean('success').default(true).notNull(),
  errorMessage: text('error_message'),
  toolsUsed: text('tools_used').array(),
  sources: text('sources').array(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('usage_logs_user_id_idx').on(table.userId),
  tierIdx: index('usage_logs_tier_idx').on(table.tier),
  createdAtIdx: index('usage_logs_created_at_idx').on(table.createdAt),
  successIdx: index('usage_logs_success_idx').on(table.success),
}));

// System settings - key-value store for global config
export const systemSettings = pgTable('system_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: text('key').unique().notNull(),
  value: jsonb('value').notNull(),
  description: text('description'),
  updatedBy: uuid('updated_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  keyIdx: index('system_settings_key_idx').on(table.key),
}));

// Waiting list - for managing access requests
export const waitingList = pgTable('waiting_list', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').unique().notNull(),
  name: text('name'),
  organization: text('organization'),
  reason: text('reason'),
  status: waitlistStatusEnum('status').default('PENDING').notNull(),
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('waiting_list_email_idx').on(table.email),
  statusIdx: index('waiting_list_status_idx').on(table.status),
}));

// Audit log - track all admin actions
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(), // 'user', 'settings', 'waitlist', etc.
  entityId: text('entity_id'),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('audit_logs_user_id_idx').on(table.userId),
  actionIdx: index('audit_logs_action_idx').on(table.action),
  entityTypeIdx: index('audit_logs_entity_type_idx').on(table.entityType),
  createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
}));

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  limits: one(userLimits, {
    fields: [users.id],
    references: [userLimits.userId],
  }),
  usageLogs: many(usageLogs),
  auditLogs: many(auditLogs),
}));

export const userLimitsRelations = relations(userLimits, ({ one }) => ({
  user: one(users, {
    fields: [userLimits.userId],
    references: [users.id],
  }),
}));

export const usageLogsRelations = relations(usageLogs, ({ one }) => ({
  user: one(users, {
    fields: [usageLogs.userId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserLimits = typeof userLimits.$inferSelect;
export type NewUserLimits = typeof userLimits.$inferInsert;
export type UsageLog = typeof usageLogs.$inferSelect;
export type NewUsageLog = typeof usageLogs.$inferInsert;
export type SystemSetting = typeof systemSettings.$inferSelect;
export type NewSystemSetting = typeof systemSettings.$inferInsert;
export type WaitingListEntry = typeof waitingList.$inferSelect;
export type NewWaitingListEntry = typeof waitingList.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
