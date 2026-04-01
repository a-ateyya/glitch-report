import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Main incidents table
export const incidents = sqliteTable("incidents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  titleAr: text("title_ar").notNull(),
  titleEn: text("title_en"),
  descriptionAr: text("description_ar").notNull(),
  descriptionEn: text("description_en"),
  category: text("category").notNull(), // 'ai' | 'crypto' | 'iot'
  severity: text("severity").notNull().default("medium"), // 'low' | 'medium' | 'high' | 'critical'
  lossAmount: integer("loss_amount"), // in USD, null if no monetary loss
  jobsLost: integer("jobs_lost"), // number of people who lost jobs, null if not applicable
  company: text("company"), // company name involved (e.g. OpenAI, Tesla, Binance)
  date: text("date").notNull(), // ISO date string
  sourcesJson: text("sources_json").notNull().default("[]"), // JSON array of {title, url, archiveUrl?}
  tagsJson: text("tags_json").notNull().default("[]"), // JSON array of strings
  imageUrl: text("image_url"),
  status: text("status").notNull().default("published"), // 'draft' | 'published' | 'archived'
  isStarred: integer("is_starred").notNull().default(0),
  sourceType: text("source_type").notNull().default("manual"), // 'manual' | 'auto'
  createdAt: text("created_at").notNull(),
});

export const insertIncidentSchema = createInsertSchema(incidents).omit({
  id: true,
});

export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type Incident = typeof incidents.$inferSelect;

// Stats tracking
export const stats = sqliteTable("stats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  totalLossAi: integer("total_loss_ai").notNull().default(0),
  totalLossCrypto: integer("total_loss_crypto").notNull().default(0),
  totalLossIot: integer("total_loss_iot").notNull().default(0),
  totalIncidents: integer("total_incidents").notNull().default(0),
  lastUpdated: text("last_updated").notNull(),
});
