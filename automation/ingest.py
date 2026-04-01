#!/usr/bin/env python3
"""
The Glitch Report - Automated Data Ingestion Pipeline
=====================================================

Fetches incidents from multiple sources:
1. AI Incident Database (AIID) API
2. RSS feeds from security/crypto/tech news
3. Hacker News (AI/IoT/crypto failure stories)
4. Reddit threads (r/cryptocurrency scams, r/netsec, etc.)

Then uses an LLM to:
- Classify each incident (ai/crypto/iot)
- Translate to Arabic
- Assess severity
- Extract loss amounts
- Generate summary

Finally pushes to the Glitch Report API.
"""

import os
import json
import re
import sys
import hashlib
import sqlite3
from datetime import datetime, timedelta
from typing import Optional
import requests
import feedparser
from bs4 import BeautifulSoup
from anthropic import Anthropic

# Configuration
API_BASE = os.environ.get("GLITCH_API_BASE", "http://localhost:5000")
SEEN_DB = os.path.join(os.path.dirname(__file__), "seen_articles.db")

# Initialize Anthropic client (picks up ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN from env)
claude_client = None
try:
    claude_client = Anthropic()
except Exception:
    pass

# Initialize seen articles database
def init_seen_db():
    conn = sqlite3.connect(SEEN_DB)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS seen_articles (
            hash TEXT PRIMARY KEY,
            title TEXT,
            source TEXT,
            seen_at TEXT
        )
    """)
    conn.commit()
    return conn

def is_seen(conn, url_or_title: str) -> bool:
    h = hashlib.md5(url_or_title.encode()).hexdigest()
    row = conn.execute("SELECT 1 FROM seen_articles WHERE hash = ?", (h,)).fetchone()
    return row is not None

def mark_seen(conn, url_or_title: str, title: str, source: str):
    h = hashlib.md5(url_or_title.encode()).hexdigest()
    conn.execute(
        "INSERT OR IGNORE INTO seen_articles (hash, title, source, seen_at) VALUES (?, ?, ?, ?)",
        (h, title, source, datetime.utcnow().isoformat())
    )
    conn.commit()


# ========== DATA SOURCES ==========

def fetch_rss_feeds() -> list[dict]:
    """Fetch articles from curated RSS feeds about AI failures, crypto scams, IoT issues."""
    feeds = [
        # AI failures / risks
        {"url": "https://incidentdatabase.ai/rss.xml", "category_hint": "ai", "source_name": "AI Incident Database"},
        {"url": "https://www.technologyreview.com/feed/", "category_hint": "ai", "source_name": "MIT Tech Review"},
        {"url": "https://techcrunch.com/category/artificial-intelligence/feed/", "category_hint": "ai", "source_name": "TechCrunch AI"},
        # Crypto scams
        {"url": "https://www.coindesk.com/arc/outboundfeeds/rss/", "category_hint": "crypto", "source_name": "CoinDesk"},
        {"url": "https://cointelegraph.com/rss", "category_hint": "crypto", "source_name": "CoinTelegraph"},
        # IoT / security
        {"url": "https://www.bleepingcomputer.com/feed/", "category_hint": "iot", "source_name": "BleepingComputer"},
        {"url": "https://krebsonsecurity.com/feed/", "category_hint": "iot", "source_name": "Krebs on Security"},
        {"url": "https://thehackernews.com/feeds/posts/default", "category_hint": "iot", "source_name": "The Hacker News"},
    ]
    
    articles = []
    for feed_info in feeds:
        try:
            feed = feedparser.parse(feed_info["url"])
            for entry in feed.entries[:10]:  # Last 10 per feed
                title = entry.get("title", "")
                link = entry.get("link", "")
                summary = entry.get("summary", "")
                published = entry.get("published", "")
                
                # Clean HTML from summary
                if summary:
                    soup = BeautifulSoup(summary, "html.parser")
                    summary = soup.get_text()[:500]
                
                articles.append({
                    "title": title,
                    "url": link,
                    "summary": summary,
                    "published": published,
                    "category_hint": feed_info["category_hint"],
                    "source_name": feed_info["source_name"],
                })
        except Exception as e:
            print(f"  [WARN] Failed to fetch {feed_info['source_name']}: {e}")
    
    return articles


def fetch_hackernews_stories() -> list[dict]:
    """Fetch relevant stories from Hacker News."""
    articles = []
    keywords = [
        "AI failure", "AI bias", "AI accident", "AI incident",
        "crypto scam", "crypto hack", "DeFi exploit", "rug pull",
        "IoT vulnerability", "IoT hack", "smart device", "security breach",
    ]
    
    try:
        # Search HN via Algolia API
        for keyword in keywords[:6]:  # Limit to avoid rate limits
            resp = requests.get(
                "https://hn.algolia.com/api/v1/search_by_date",
                params={
                    "query": keyword,
                    "tags": "story",
                    "numericFilters": f"created_at_i>{int((datetime.utcnow() - timedelta(days=7)).timestamp())}",
                    "hitsPerPage": 5,
                },
                timeout=10,
            )
            if resp.ok:
                data = resp.json()
                for hit in data.get("hits", []):
                    articles.append({
                        "title": hit.get("title", ""),
                        "url": hit.get("url", f"https://news.ycombinator.com/item?id={hit.get('objectID', '')}"),
                        "summary": hit.get("title", ""),
                        "published": hit.get("created_at", ""),
                        "category_hint": "ai" if "ai" in keyword.lower() else "crypto" if "crypto" in keyword.lower() else "iot",
                        "source_name": "Hacker News",
                    })
    except Exception as e:
        print(f"  [WARN] HN fetch failed: {e}")
    
    return articles


# ========== LLM CLASSIFICATION + TRANSLATION ==========

def classify_and_translate(article: dict) -> Optional[dict]:
    """Use Claude to classify, assess severity, translate to Arabic, and structure the incident."""
    if not claude_client:
        print("  [SKIP] Anthropic client not available, skipping LLM classification")
        return None
    
    prompt = f"""You are an analyst for "The Glitch Report" (تقرير الخلل), an Arabic-language website that documents:
1. AI failures, biases, and incidents
2. Cryptocurrency scams, hacks, and fraud
3. IoT device failures, vulnerabilities, and security breaches

Analyze this article and determine if it's relevant. If it IS relevant, provide structured data. If it's NOT relevant (e.g., just a product announcement, general tech news, or opinion piece), respond with {{"relevant": false}}.

Article:
Title: {article['title']}
Source: {article['source_name']}
Summary: {article['summary'][:500]}
URL: {article['url']}

If relevant, respond with this JSON (no markdown):
{{
    "relevant": true,
    "title_ar": "Arabic title (concise, journalistic, factual)",
    "title_en": "English title (concise)",
    "description_ar": "Arabic description (2-4 paragraphs, factual, include key details, numbers, and impact)",
    "description_en": "English description (1-2 sentences summary)",
    "category": "ai" or "crypto" or "iot",
    "severity": "low" or "medium" or "high" or "critical",
    "loss_amount": null or number (USD estimate if monetary loss mentioned),
    "tags": ["tag1", "tag2"] (Arabic tags, max 4)
}}

Guidelines:
- Be factual, not sensational
- The Arabic must be natural, professional Modern Standard Arabic
- Only classify as relevant if it describes an actual failure, incident, scam, hack, vulnerability, or malfunction
- Severity: low=minor glitch, medium=significant issue, high=major incident with victims, critical=widespread harm or massive loss
- For crypto: extract exact loss amounts when mentioned
- Tags should be in Arabic and relevant to the incident"""

    try:
        message = claude_client.messages.create(
            model="claude_sonnet_4_6",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}],
        )
        
        text = message.content[0].text
        # Try to parse JSON from response
        result = json.loads(text)
        if result.get("relevant"):
            return result
    except json.JSONDecodeError:
        print(f"  [WARN] Could not parse LLM response as JSON")
    except Exception as e:
        print(f"  [WARN] LLM classification failed: {e}")
    
    return None


# ========== PUSH TO API ==========

def push_to_api(incident: dict, source_url: str, source_name: str) -> bool:
    """Push a classified incident to the Glitch Report API."""
    payload = {
        "titleAr": incident["title_ar"],
        "titleEn": incident.get("title_en"),
        "descriptionAr": incident["description_ar"],
        "descriptionEn": incident.get("description_en"),
        "category": incident["category"],
        "severity": incident.get("severity", "medium"),
        "lossAmount": incident.get("loss_amount"),
        "date": datetime.utcnow().isoformat(),
        "sourcesJson": json.dumps([{"title": source_name, "url": source_url}]),
        "tagsJson": json.dumps(incident.get("tags", [])),
        "status": "draft",  # Auto-ingested articles start as drafts
        "isStarred": 0,
        "sourceType": "auto",
    }
    
    try:
        resp = requests.post(f"{API_BASE}/api/admin/incidents", json=payload, timeout=10)
        if resp.status_code == 201:
            return True
        else:
            print(f"  [WARN] API push failed: {resp.status_code} {resp.text[:200]}")
    except Exception as e:
        print(f"  [WARN] API push error: {e}")
    
    return False


# ========== MAIN PIPELINE ==========

def run_pipeline():
    print("=" * 60)
    print("THE GLITCH REPORT — Automated Ingestion Pipeline")
    print(f"Time: {datetime.utcnow().isoformat()}")
    print("=" * 60)
    
    conn = init_seen_db()
    
    # Step 1: Gather articles from all sources
    print("\n[1/4] Fetching RSS feeds...")
    rss_articles = fetch_rss_feeds()
    print(f"  Found {len(rss_articles)} RSS articles")
    
    print("\n[2/4] Fetching Hacker News stories...")
    hn_articles = fetch_hackernews_stories()
    print(f"  Found {len(hn_articles)} HN stories")
    
    all_articles = rss_articles + hn_articles
    print(f"\n  Total raw articles: {len(all_articles)}")
    
    # Step 2: Deduplicate
    print("\n[3/4] Deduplicating...")
    new_articles = []
    for article in all_articles:
        key = article["url"] or article["title"]
        if not is_seen(conn, key):
            new_articles.append(article)
    
    print(f"  New (unseen) articles: {len(new_articles)}")
    
    # Step 3: Classify and translate
    print("\n[4/4] Classifying & translating with LLM...")
    created = 0
    skipped = 0
    
    for i, article in enumerate(new_articles[:30]):  # Process max 30 per run
        print(f"\n  [{i+1}/{min(len(new_articles), 30)}] {article['title'][:60]}...")
        
        # Mark as seen regardless of outcome
        mark_seen(conn, article["url"] or article["title"], article["title"], article["source_name"])
        
        result = classify_and_translate(article)
        
        if result and result.get("relevant"):
            success = push_to_api(result, article["url"], article["source_name"])
            if success:
                created += 1
                print(f"    ✓ Created: {result.get('title_ar', '')[:50]}")
            else:
                print(f"    ✗ Failed to push")
        else:
            skipped += 1
            print(f"    — Not relevant, skipped")
    
    # Summary
    print("\n" + "=" * 60)
    print(f"SUMMARY:")
    print(f"  Total fetched: {len(all_articles)}")
    print(f"  New articles: {len(new_articles)}")
    print(f"  Created (as drafts): {created}")
    print(f"  Skipped (not relevant): {skipped}")
    print("=" * 60)
    
    conn.close()


if __name__ == "__main__":
    run_pipeline()
