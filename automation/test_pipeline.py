#!/usr/bin/env python3
"""Quick test of the full pipeline: fetch 5 articles, classify with LLM, push to API."""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

# Override max articles to process
import ingest
# Monkey-patch to process fewer articles for testing
original_run = ingest.run_pipeline

def test_run():
    print("=== TEST RUN (max 5 articles) ===\n")
    conn = ingest.init_seen_db()
    
    # Fetch just a few
    print("[1] Fetching RSS feeds...")
    rss = ingest.fetch_rss_feeds()
    print(f"  Got {len(rss)} RSS articles")
    
    print("\n[2] Fetching HN stories...")
    hn = ingest.fetch_hackernews_stories()
    print(f"  Got {len(hn)} HN stories")
    
    all_articles = rss + hn
    
    # Deduplicate
    new_articles = []
    for a in all_articles:
        key = a["url"] or a["title"]
        if not ingest.is_seen(conn, key):
            new_articles.append(a)
    
    print(f"\n[3] New articles: {len(new_articles)}")
    
    # Process only 5
    created = 0
    skipped = 0
    for i, article in enumerate(new_articles[:5]):
        print(f"\n  [{i+1}/5] {article['title'][:70]}...")
        ingest.mark_seen(conn, article["url"] or article["title"], article["title"], article["source_name"])
        
        result = ingest.classify_and_translate(article)
        if result and result.get("relevant"):
            success = ingest.push_to_api(result, article["url"], article["source_name"])
            if success:
                created += 1
                print(f"    ✓ Created: {result.get('title_ar', '')[:60]}")
            else:
                print(f"    ✗ Failed to push to API")
        else:
            skipped += 1
            if result is None:
                print(f"    — LLM returned None (not relevant or error)")
            else:
                print(f"    — Not relevant")
    
    print(f"\n=== RESULTS: {created} created, {skipped} skipped ===")
    conn.close()

if __name__ == "__main__":
    test_run()
