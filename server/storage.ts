import { incidents, stats, type Incident, type InsertIncident } from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, like, or, and, sql } from "drizzle-orm";

const sqlite = new Database("glitch.db");
sqlite.pragma("journal_mode = WAL");
const db = drizzle(sqlite);

export interface IStorage {
  // Incidents
  getIncidents(filters?: {
    category?: string;
    status?: string;
    search?: string;
    starred?: boolean;
    limit?: number;
    offset?: number;
  }): Incident[];
  getIncident(id: number): Incident | undefined;
  createIncident(data: InsertIncident): Incident;
  updateIncident(id: number, data: Partial<InsertIncident>): Incident | undefined;
  deleteIncident(id: number): boolean;
  getIncidentCount(filters?: { category?: string; status?: string }): number;
  
  // Stats
  getStats(): { totalLossAi: number; totalLossCrypto: number; totalLossIot: number; totalIncidents: number };
  recalculateStats(): void;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    // Run migrations
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS incidents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title_ar TEXT NOT NULL,
        title_en TEXT,
        description_ar TEXT NOT NULL,
        description_en TEXT,
        category TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'medium',
        loss_amount INTEGER,
        date TEXT NOT NULL,
        sources_json TEXT NOT NULL DEFAULT '[]',
        tags_json TEXT NOT NULL DEFAULT '[]',
        image_url TEXT,
        status TEXT NOT NULL DEFAULT 'published',
        is_starred INTEGER NOT NULL DEFAULT 0,
        source_type TEXT NOT NULL DEFAULT 'manual',
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        total_loss_ai INTEGER NOT NULL DEFAULT 0,
        total_loss_crypto INTEGER NOT NULL DEFAULT 0,
        total_loss_iot INTEGER NOT NULL DEFAULT 0,
        total_incidents INTEGER NOT NULL DEFAULT 0,
        last_updated TEXT NOT NULL
      );
    `);
  }

  getIncidents(filters?: {
    category?: string;
    status?: string;
    search?: string;
    starred?: boolean;
    limit?: number;
    offset?: number;
  }): Incident[] {
    const conditions = [];
    
    if (filters?.category && filters.category !== "all") {
      conditions.push(eq(incidents.category, filters.category));
    }
    if (filters?.status) {
      conditions.push(eq(incidents.status, filters.status));
    }
    if (filters?.starred) {
      conditions.push(eq(incidents.isStarred, 1));
    }
    if (filters?.search) {
      conditions.push(
        or(
          like(incidents.titleAr, `%${filters.search}%`),
          like(incidents.titleEn, `%${filters.search}%`),
          like(incidents.descriptionAr, `%${filters.search}%`)
        )!
      );
    }

    let query = db.select().from(incidents);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const result = query
      .orderBy(desc(incidents.date), desc(incidents.id))
      .limit(filters?.limit || 50)
      .offset(filters?.offset || 0)
      .all();
    
    return result;
  }

  getIncident(id: number): Incident | undefined {
    return db.select().from(incidents).where(eq(incidents.id, id)).get();
  }

  createIncident(data: InsertIncident): Incident {
    return db.insert(incidents).values(data).returning().get();
  }

  updateIncident(id: number, data: Partial<InsertIncident>): Incident | undefined {
    const existing = this.getIncident(id);
    if (!existing) return undefined;
    
    return db.update(incidents).set(data).where(eq(incidents.id, id)).returning().get();
  }

  deleteIncident(id: number): boolean {
    const result = db.delete(incidents).where(eq(incidents.id, id)).run();
    return result.changes > 0;
  }

  getIncidentCount(filters?: { category?: string; status?: string }): number {
    const conditions = [];
    if (filters?.category && filters.category !== "all") {
      conditions.push(eq(incidents.category, filters.category));
    }
    if (filters?.status) {
      conditions.push(eq(incidents.status, filters.status));
    }

    let query = db.select({ count: sql<number>`count(*)` }).from(incidents);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const result = query.get();
    return result?.count || 0;
  }

  getStats() {
    const aiLoss = db.select({ total: sql<number>`COALESCE(SUM(loss_amount), 0)` })
      .from(incidents)
      .where(and(eq(incidents.category, "ai"), eq(incidents.status, "published")))
      .get();
    
    const cryptoLoss = db.select({ total: sql<number>`COALESCE(SUM(loss_amount), 0)` })
      .from(incidents)
      .where(and(eq(incidents.category, "crypto"), eq(incidents.status, "published")))
      .get();
    
    const iotLoss = db.select({ total: sql<number>`COALESCE(SUM(loss_amount), 0)` })
      .from(incidents)
      .where(and(eq(incidents.category, "iot"), eq(incidents.status, "published")))
      .get();
    
    const count = db.select({ count: sql<number>`count(*)` })
      .from(incidents)
      .where(eq(incidents.status, "published"))
      .get();

    return {
      totalLossAi: aiLoss?.total || 0,
      totalLossCrypto: cryptoLoss?.total || 0,
      totalLossIot: iotLoss?.total || 0,
      totalIncidents: count?.count || 0,
    };
  }

  recalculateStats() {
    // Stats are calculated on the fly, no need to persist
  }
}

export const storage = new DatabaseStorage();
