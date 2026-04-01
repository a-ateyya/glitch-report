/**
 * The Glitch Report — Automated Ingestion Pipeline (Node.js)
 * 
 * Fetches articles from RSS feeds and Hacker News,
 * classifies them with Claude, translates to Arabic,
 * and saves as draft incidents.
 */

import { storage, sqlite } from "./storage";
import crypto from "crypto";

// ========== GEMINI LLM CLIENT ==========

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_FLASH = "gemini-2.5-flash";
const GEMINI_PRO = "gemini-2.5-pro";

function geminiUrl(model: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
}

async function callGemini(prompt: string, maxTokens: number = 1000, usePro: boolean = false): Promise<string | null> {
  if (!GEMINI_API_KEY) {
    console.log("  [SKIP] GEMINI_API_KEY not set");
    return null;
  }
  const model = usePro ? GEMINI_PRO : GEMINI_FLASH;
  const config: any = {
    maxOutputTokens: maxTokens,
    temperature: 0.3,
  };
  // Disable thinking for Flash to save tokens
  if (!usePro) {
    config.thinkingConfig = { thinkingBudget: 0 };
  }
  const resp = await fetch(geminiUrl(model), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: config,
    }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Gemini API error ${resp.status}: ${err.slice(0, 200)}`);
  }
  const data = await resp.json() as any;
  // Extract text from parts (Pro may have thinking parts)
  const parts = data.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.text) return part.text;
  }
  return null;
}

// ========== SEEN ARTICLES TRACKING ==========

function initSeenTable() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS seen_articles (
      hash TEXT PRIMARY KEY,
      title TEXT,
      source TEXT,
      seen_at TEXT
    )
  `);
}

function isSeen(urlOrTitle: string): boolean {
  const hash = crypto.createHash("md5").update(urlOrTitle).digest("hex");
  const row = sqlite.prepare("SELECT 1 FROM seen_articles WHERE hash = ?").get(hash);
  return !!row;
}

function markSeen(urlOrTitle: string, title: string, source: string) {
  const hash = crypto.createHash("md5").update(urlOrTitle).digest("hex");
  sqlite.prepare(
    "INSERT OR IGNORE INTO seen_articles (hash, title, source, seen_at) VALUES (?, ?, ?, ?)"
  ).run(hash, title, source, new Date().toISOString());
}

// ========== RSS FEED PARSER ==========

interface RawArticle {
  title: string;
  url: string;
  summary: string;
  published: string;
  categoryHint: string;
  sourceName: string;
}

const RSS_FEEDS = [
  // AI failures & incidents
  { url: "https://incidentdatabase.ai/rss.xml", categoryHint: "ai", sourceName: "AI Incident Database" },
  { url: "https://www.technologyreview.com/feed/", categoryHint: "ai", sourceName: "MIT Tech Review" },
  { url: "https://techcrunch.com/category/artificial-intelligence/feed/", categoryHint: "ai", sourceName: "TechCrunch AI" },
  // AI layoffs & job displacement
  { url: "https://techcrunch.com/tag/layoffs/feed/", categoryHint: "ai", sourceName: "TechCrunch Layoffs" },
  { url: "https://hrkatha.com/tag/layoff/feed/", categoryHint: "ai", sourceName: "HrKatha Layoffs" },
  // Crypto scams & hacks
  { url: "https://www.coindesk.com/arc/outboundfeeds/rss/", categoryHint: "crypto", sourceName: "CoinDesk" },
  { url: "https://cointelegraph.com/rss", categoryHint: "crypto", sourceName: "CoinTelegraph" },
  // IoT & security breaches
  { url: "https://www.bleepingcomputer.com/feed/", categoryHint: "iot", sourceName: "BleepingComputer" },
  { url: "https://krebsonsecurity.com/feed/", categoryHint: "iot", sourceName: "Krebs on Security" },
  { url: "https://thehackernews.com/feeds/posts/default", categoryHint: "iot", sourceName: "The Hacker News" },
  // IoT-specific feeds
  { url: "https://cybernews.com/security/feed/", categoryHint: "iot", sourceName: "CyberNews" },
  { url: "https://www.darkreading.com/rss.xml", categoryHint: "iot", sourceName: "Dark Reading" },
  { url: "https://cybersecuritynews.com/feed/", categoryHint: "iot", sourceName: "Cyber Security News" },
  { url: "https://www.securityweek.com/feed/", categoryHint: "iot", sourceName: "SecurityWeek" },
  { url: "https://us-cert.cisa.gov/ics/advisories/advisories.xml", categoryHint: "iot", sourceName: "CISA ICS Advisories" },
  { url: "https://www.reddit.com/r/netsec/.rss", categoryHint: "iot", sourceName: "r/netsec" },
];

async function fetchRSSFeeds(): Promise<RawArticle[]> {
  const articles: RawArticle[] = [];
  
  // Simple XML RSS parser (no external dependency)
  for (const feed of RSS_FEEDS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      
      const resp = await fetch(feed.url, { 
        signal: controller.signal,
        headers: { "User-Agent": "GlitchReport/1.0" }
      });
      clearTimeout(timeout);
      
      if (!resp.ok) continue;
      const xml = await resp.text();
      
      // Parse RSS items with regex (simple but effective)
      const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || 
                    xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
      
      for (const item of items.slice(0, 10)) {
        const title = extractTag(item, "title");
        const link = extractTag(item, "link") || extractAttr(item, "link", "href");
        const description = stripHtml(extractTag(item, "description") || extractTag(item, "summary") || extractTag(item, "content") || "");
        const pubDate = extractTag(item, "pubDate") || extractTag(item, "published") || extractTag(item, "updated") || "";
        
        if (title) {
          articles.push({
            title,
            url: link || "",
            summary: description.slice(0, 500),
            published: pubDate,
            categoryHint: feed.categoryHint,
            sourceName: feed.sourceName,
          });
        }
      }
    } catch (e: any) {
      console.log(`  [WARN] Failed to fetch ${feed.sourceName}: ${e.message}`);
    }
  }
  
  return articles;
}

function extractTag(xml: string, tag: string): string {
  // Handle CDATA
  const cdataMatch = xml.match(new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, "i"));
  if (cdataMatch) return cdataMatch[1].trim();
  
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? match[1].trim() : "";
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, "i"));
  return match ? match[1] : "";
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// ========== HACKER NEWS ==========

const HN_KEYWORDS = [
  "AI failure", "AI bias", "AI accident", "AI incident",
  "AI layoffs", "AI replacing jobs", "AI job cuts",
  "crypto scam", "crypto hack", "DeFi exploit", "rug pull",
  "IoT vulnerability", "IoT hack", "smart device", "security breach",
  "smart home hack", "IoT botnet", "IoT malware", "connected device flaw",
  "smart lock vulnerability", "camera hack", "router exploit",
];

async function fetchHackerNews(): Promise<RawArticle[]> {
  const articles: RawArticle[] = [];
  const weekAgo = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
  
  for (const keyword of HN_KEYWORDS.slice(0, 10)) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      
      const url = `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(keyword)}&tags=story&numericFilters=created_at_i>${weekAgo}&hitsPerPage=5`;
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      
      if (!resp.ok) continue;
      const data = await resp.json() as any;
      
      for (const hit of (data.hits || [])) {
        const catHint = keyword.toLowerCase().includes("ai") ? "ai" 
          : keyword.toLowerCase().includes("crypto") || keyword.toLowerCase().includes("defi") || keyword.toLowerCase().includes("rug") ? "crypto"
          : "iot";
        
        articles.push({
          title: hit.title || "",
          url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
          summary: hit.title || "",
          published: hit.created_at || "",
          categoryHint: catHint,
          sourceName: "Hacker News",
        });
      }
    } catch (e: any) {
      console.log(`  [WARN] HN fetch failed for "${keyword}": ${e.message}`);
    }
  }
  
  return articles;
}

// ========== LLM CLASSIFICATION ==========

interface ClassifiedIncident {
  relevant: boolean;
  title_ar?: string;
  title_en?: string;
  description_ar?: string;
  description_en?: string;
  category?: "ai" | "crypto" | "iot";
  severity?: "low" | "medium" | "high" | "critical";
  loss_amount?: number | null;
  jobs_lost?: number | null;
  company?: string | null;
  tags?: string[];
  headline_score?: number;
}

async function classifyAndTranslate(article: RawArticle): Promise<ClassifiedIncident | null> {
  const prompt = `You are a senior Arabic newsroom editor for "تقرير الخلل" (The Glitch Report), a site that covers:
1. AI failures, biases, and incidents (ذكاء اصطناعي)
2. Crypto scams, hacks, and fraud (كريبتو)
3. IoT device failures and security breaches (إنترنت الأشياء)

Analyze this article. If it describes an actual failure, incident, scam, hack, vulnerability, or malfunction, provide structured data. If NOT relevant (product announcement, general news, opinion), respond with {"relevant": false}.

Article:
Title: ${article.title}
Source: ${article.sourceName}
Summary: ${article.summary.slice(0, 500)}
URL: ${article.url}

If relevant, respond with this JSON (no markdown):
{
    "relevant": true,
    "title_ar": "Arabic headline",
    "title_en": "English headline",
    "description_ar": "Arabic body (2-4 paragraphs)",
    "description_en": "English summary (1-2 sentences)",
    "category": "ai" or "crypto" or "iot",
    "severity": "low" or "medium" or "high" or "critical",
    "loss_amount": null or number (USD if monetary loss),
    "jobs_lost": null or number (if people lost jobs because of this),
    "company": "Company name involved (e.g. OpenAI, Tesla, Binance)" or null,
    "tags": ["tag1", "tag2"] (Arabic, max 3),
    "headline_score": 1-10 (self-rate your headline quality)
}

=== HEADLINE STYLE GUIDE (CRITICAL) ===

You are writing as a NEWSROOM EDITOR, not a translator. Do NOT translate the English title — write a fresh, punchy Arabic headline from scratch.

Rules:
1. NEVER USE PASSIVE VOICE (بناء للمجهول): Do NOT write "يُكشف"، "تُسرق"، "يُستغل"، "اُخترق". Always use active voice: "يكشف"، "يسرق"، "يستغل"، "يخترق". The SUBJECT does the action.
2. USE ACTIVE, PUNCHY VERBS: "يضرب"، "يفشل"، "يكشف"، "يطيح" — the verb should hit hard.
3. NAME THE COMPANY: "خوارزميات فيسبوك" not "خوارزمية توصية". The reader wants WHO, not WHAT.
4. CUT THE FAT: Remove unnecessary words. Shorter = stronger. "في 3 دول" not "في ثلاث دول". Use digits not spelled-out numbers.
5. MAX 10 WORDS in the headline. Every word must earn its place.
6. Do NOT use "يتم"، "تم"، "قام بـ" — these are weak constructions.
7. Do NOT use "يُكتشف"، "تُسرق"، "يُعلن" — use "يكتشف"، "تسرق"، "يعلن" instead.

Examples of GOOD headlines:
- اختراق أجهزة منزلية ذكية يضرب 3 دول
- نظام إنذار ذكي يفشل في التحذير من حريق مدمر
- خوارزميات فيسبوك تنشر معلومات مضللة

Examples of BAD headlines (do NOT write like this):
- اختراق أجهزة منزلية ذكية في ثلاث دول (لا فعل قوي، أرقام مكتوبة)
- تعطل نظام إنذار ذكي أثناء حريق فعلي (ممل، وصفي)
- خوارزمية توصية تروّج لمعلومات مضللة على نطاق واسع (لا اسم شركة، طويل)

=== BODY TEXT GUIDELINES ===
- Write like an editor, not a translator. Natural Arabic prose.
- Lead with the most impactful fact.
- Include numbers, dates, affected users count.
- Short paragraphs (2-3 sentences each).
- If people lost jobs, mention the count in jobs_lost field.
- Always identify the company involved in the "company" field.

=== SEVERITY ===
- low: minor glitch, no real harm
- medium: significant issue, some users affected
- high: major incident, victims or large losses
- critical: widespread harm, massive financial loss, deaths`;

  try {
    const text = await callGemini(prompt, 1000);
    if (!text) return null;
    
    // Extract JSON from response (Gemini sometimes wraps in markdown)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log(`  [WARN] No JSON found in Gemini response`);
      return null;
    }
    const result: ClassifiedIncident = JSON.parse(jsonMatch[0]);
    return result.relevant ? result : null;
  } catch (e: any) {
    if (e.message?.includes("JSON")) {
      console.log(`  [WARN] Could not parse LLM response as JSON`);
    } else {
      console.log(`  [WARN] LLM classification failed: ${e.message?.slice(0, 100)}`);
    }
    return null;
  }
}

// ========== HEADLINE REVIEWER ==========

async function reviewHeadline(incident: ClassifiedIncident): Promise<ClassifiedIncident> {
  // Only review if headline_score < 7
  if (!incident.headline_score || incident.headline_score >= 7) return incident;

  const prompt = `أنت محرر عناوين محترف في موقع "تقرير الخلل". العنوان التالي حصل على تقييم ${incident.headline_score}/10.

العنوان الحالي: ${incident.title_ar}
الوصف: ${incident.description_ar?.slice(0, 200)}
الشركة: ${incident.company || "غير محددة"}

أعد كتابة العنوان بحيث يكون:
1. فعل قوي ونشط مبني للمعلوم (يضرب، يفشل، يكشف، يطيح) — ممنوع البناء للمجهول نهائياً. لا "يُكشف" بل "يكشف"، لا "تُسرق" بل "تسرق"، لا "يُستغل" بل "يستغل"
2. اسم الشركة مذكور إن وُجد
3. أرقام بالأرقام لا بالحروف
4. 10 كلمات كحد أقصى
5. بدون "يتم" أو "تم" أو "قام بـ"

أمثلة جيدة:
- اختراق أجهزة منزلية ذكية يضرب 3 دول
- نظام إنذار ذكي يفشل في التحذير من حريق مدمر
- خوارزميات فيسبوك تنشر معلومات مضللة

أجب بالعنوان الجديد فقط، بدون أي شرح أو علامات ترقيم إضافية.`;

  try {
    const newTitle = await callGemini(prompt, 2000, true); // Use Pro for headline review
    if (newTitle && newTitle.trim().length > 5 && newTitle.trim().length < 100) {
      const cleaned = newTitle.trim().replace(/^["'`]|["'`]$/g, '');
      console.log(`    ✎ Headline rewritten: "${incident.title_ar}" → "${cleaned}"`);
      incident.title_ar = cleaned;
      incident.headline_score = 8; // Mark as reviewed
    }
  } catch (e: any) {
    console.log(`    [WARN] Headline review failed: ${e.message?.slice(0, 60)}`);
  }

  return incident;
}

// ========== MAIN PIPELINE ==========

export async function runIngestion(maxArticles: number = 30): Promise<{
  totalFetched: number;
  newArticles: number;
  created: number;
  skipped: number;
  errors: number;
  details: string[];
}> {
  console.log("=" .repeat(60));
  console.log("THE GLITCH REPORT — Automated Ingestion Pipeline");
  console.log(`Time: ${new Date().toISOString()}`);
  console.log("=" .repeat(60));
  
  initSeenTable();
  
  const details: string[] = [];
  
  // Step 1: Fetch from all sources
  console.log("\n[1/3] Fetching RSS feeds...");
  const rssArticles = await fetchRSSFeeds();
  console.log(`  Found ${rssArticles.length} RSS articles`);
  
  console.log("\n[2/3] Fetching Hacker News stories...");
  const hnArticles = await fetchHackerNews();
  console.log(`  Found ${hnArticles.length} HN stories`);
  
  const allArticles = [...rssArticles, ...hnArticles];
  console.log(`\n  Total raw articles: ${allArticles.length}`);
  
  // Step 2: Deduplicate
  const newArticles: RawArticle[] = [];
  for (const article of allArticles) {
    const key = article.url || article.title;
    if (!isSeen(key)) {
      newArticles.push(article);
    }
  }
  console.log(`  New (unseen) articles: ${newArticles.length}`);
  
  // Step 3: Classify and push
  console.log(`\n[3/3] Classifying & translating (max ${maxArticles})...`);
  let created = 0;
  let skipped = 0;
  let errors = 0;
  
  for (let i = 0; i < Math.min(newArticles.length, maxArticles); i++) {
    const article = newArticles[i];
    console.log(`\n  [${i + 1}/${Math.min(newArticles.length, maxArticles)}] ${article.title.slice(0, 60)}...`);
    
    // Mark as seen regardless
    markSeen(article.url || article.title, article.title, article.sourceName);
    
    let result = await classifyAndTranslate(article);
    
    if (result && result.relevant) {
      // Run headline reviewer for weak headlines
      result = await reviewHeadline(result);
      
      try {
        const incident = storage.createIncident({
          titleAr: result.title_ar || "",
          titleEn: result.title_en || null,
          descriptionAr: result.description_ar || "",
          descriptionEn: result.description_en || null,
          category: result.category || "ai",
          severity: result.severity || "medium",
          lossAmount: result.loss_amount ? String(result.loss_amount) : null,
          jobsLost: result.jobs_lost || null,
          company: result.company || null,
          date: new Date().toISOString(),
          sourcesJson: JSON.stringify([{ title: article.sourceName, url: article.url }]),
          tagsJson: JSON.stringify(result.tags || []),
          status: "draft",
          isStarred: 0,
          sourceType: "auto",
          createdAt: new Date().toISOString(),
        });
        created++;
        details.push(`✓ ${result.title_ar?.slice(0, 50)}`);
        console.log(`    ✓ Created: ${result.title_ar?.slice(0, 50)}`);
      } catch (e: any) {
        errors++;
        console.log(`    ✗ DB error: ${e.message}`);
      }
    } else {
      skipped++;
      console.log(`    — Not relevant, skipped`);
    }
  }
  
  console.log("\n" + "=".repeat(60));
  console.log(`SUMMARY: ${created} created, ${skipped} skipped, ${errors} errors`);
  console.log("=".repeat(60));
  
  return {
    totalFetched: allArticles.length,
    newArticles: newArticles.length,
    created,
    skipped,
    errors,
    details,
  };
}
