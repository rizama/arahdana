import { pgTable, integer, text, timestamp } from 'drizzle-orm/pg-core';
export const feedback = pgTable('feedback', { id: integer().primaryKey().generatedAlwaysAsIdentity(), email: text().notNull(), message: text().notNull(), page: text().notNull(), created_at: timestamp({ withTimezone: true }).defaultNow().notNull() });
