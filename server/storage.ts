import { incidents, stats, type Incident, type InsertIncident } from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, like, or, and, sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

// Use DATABASE_PATH env var for Railway, fallback to local glitch.db
const DB_PATH = process.env.DATABASE_PATH || "glitch.db";
// Ensure the directory exists before opening database
const _dbDir = path.dirname(DB_PATH);
if (_dbDir !== '.' && !fs.existsSync(_dbDir)) {
  fs.mkdirSync(_dbDir, { recursive: true });
}
const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
const db = drizzle(sqlite);

export { sqlite, db };

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
        jobs_lost INTEGER,
        company TEXT,
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
    // Add new columns if they don't exist (migration for existing DBs)
    try { sqlite.exec(`ALTER TABLE incidents ADD COLUMN jobs_lost INTEGER`); } catch (e) { /* column exists */ }
    try { sqlite.exec(`ALTER TABLE incidents ADD COLUMN company TEXT`); } catch (e) { /* column exists */ }

    // Site settings table (editable content)
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS site_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    // Auto-seed incidents if database is empty (for fresh Railway deployments)
    const incidentCount = (sqlite.prepare('SELECT COUNT(*) as cnt FROM incidents').get() as any).cnt;
    if (incidentCount === 0) {
      // Try multiple possible seed locations
      const seedPath = [__dirname, path.join(__dirname, '..'), '/app/dist', process.cwd()]
        .map(d => path.join(d, 'seed.sql'))
        .find(p => fs.existsSync(p)) || path.join(__dirname, 'seed.sql');
      if (fs.existsSync(seedPath)) {
        console.log('[seed] Empty database detected — loading seed.sql...');
        const seedSQL = fs.readFileSync(seedPath, 'utf-8');
        const statements = seedSQL.split(';').map(s => s.trim()).filter(s => s && !s.startsWith('--'));
        let loaded = 0;
        for (const stmt of statements) {
          try { sqlite.exec(stmt + ';'); loaded++; } catch (e) { /* skip */ }
        }
        console.log(`[seed] Loaded ${loaded} stories from seed.sql`);
      }
    }

    // Seed default about page content if not exists
    const hasAbout = sqlite.prepare("SELECT 1 FROM site_settings WHERE key = 'about_content'").get();
    if (!hasAbout) {
      sqlite.prepare("INSERT INTO site_settings (key, value) VALUES (?, ?)").run(
        'about_content',
        JSON.stringify({
          greeting: "أهلاً بكم",
          paragraphs: [
            'أكره إنترنت الأشياء، ولا أؤمن بالكريبتو، وأتخوف من الذكاء الاصطناعي، فصممت \"تقرير الخلل\" لأتابع أخبار كوابيسي الثلاثة في مكان واحد. وحين أقول صممت، أعني أني طلبت من الذكاء الاصطناعي أن يصمم، ويحسن، ويجود، ويعيد حتى رضيت.',
            'هذا التعريف أكتبه أنا محرر الموقع، وهو النص الوحيد هنا الذي كتبه صحفي بشري. باقي ما ترونه تجميعات وتلخيصات وتنبيهات مؤتمتة بالذكاء الاصطناعي.',
            'صنعت هذا المشروع على عجالة من باب التجريب واللعب واللهو والتعرف أكثر على هذه التقنية الجديدة التي تهدد وظائفنا وتعيد تعريف أدوارنا في غرف الأخبار.'
          ],
          closing: "مشاهدة ممتعة.",
          contact: {
            x: "https://x.com/Ateyya",
            linkedin: "https://www.linkedin.com/in/ateyya/?skipRedirect=true",
            instagram: "https://www.instagram.com/a.ateyya/"
          }
        })
      );
    }
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
