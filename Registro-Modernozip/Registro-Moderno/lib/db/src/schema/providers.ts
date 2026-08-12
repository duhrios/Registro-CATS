import { createInsertSchema } from "drizzle-zod";
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const providersTable = pgTable("providers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  rg: text("rg").notNull().unique(),
  company: text("company").notNull(),
  defaultService: text("default_service").notNull(),
  photoData: text("photo_data"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastVisitAt: timestamp("last_visit_at", { withTimezone: true }),
});

export const visitsTable = pgTable("provider_visits", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().references(() => providersTable.id),
  service: text("service").notNull(),
  enteredAt: timestamp("entered_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProviderSchema = createInsertSchema(providersTable).omit({
  id: true,
  createdAt: true,
  lastVisitAt: true,
});
export type InsertProvider = z.infer<typeof insertProviderSchema>;
export type Provider = typeof providersTable.$inferSelect;
export type Visit = typeof visitsTable.$inferSelect;