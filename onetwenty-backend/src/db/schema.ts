import { pgTable, serial, text, integer, varchar, timestamp } from 'drizzle-orm/pg-core';

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  group: integer('group').notNull(),         // 1, 2, or 3
  name: varchar('name', { length: 255 }).notNull(),
  maxPoints: integer('max_points').notNull(),
});

export const activities = pgTable('activities', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),   // Clerk user ID, added in Phase 6
  categoryId: integer('category_id').references(() => categories.id).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  pointsClaimed: integer('points_claimed').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  eventDate: timestamp('event_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});