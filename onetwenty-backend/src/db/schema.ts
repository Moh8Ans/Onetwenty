// onetwenty-backend/src/db/schema.ts
import { pgTable, serial, text, integer, varchar, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  group: integer('group').notNull(),
  srNo: varchar('sr_no', { length: 10 }).notNull(),
  majorHead: varchar('major_head', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  maxPoints: integer('max_points').notNull(),
  scoringType: varchar('scoring_type', { length: 20 }).notNull(), // flat | level_based | tiered | hourly | per_unit_capped
  scoringTable: jsonb('scoring_table'),
  sharedCapGroup: varchar('shared_cap_group', { length: 50 }),
  requiresManualVerification: boolean('requires_manual_verification').notNull().default(false),
  specialConditions: jsonb('special_conditions'),
});

export const activities = pgTable('activities', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  categoryId: integer('category_id').references(() => categories.id).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  pointsClaimed: integer('points_claimed').notNull(),
  computedPoints: integer('computed_points'),
  level: varchar('level', { length: 20 }),
  achievementStatus: varchar('achievement_status', { length: 20 }),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  eventDate: timestamp('event_date'),
  evidenceFileUrl: text('evidence_file_url'),
  extractionRaw: jsonb('extraction_raw'),
  duplicateOfId: integer('duplicate_of_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  validationStatus: varchar('validation_status', { length: 20 }).notNull().default('passed'), // passed | needs_manual_check
  validationNotes: text('validation_notes'),
});

export const sharedCapLedger = pgTable('shared_cap_ledger', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  sharedCapGroup: varchar('shared_cap_group', { length: 50 }).notNull(),
  totalAwarded: integer('total_awarded').notNull().default(0),
});