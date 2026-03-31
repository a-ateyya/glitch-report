# The Glitch Report — Automation Pipeline

## Overview

The ingestion pipeline automatically:
1. Fetches articles from RSS feeds, Hacker News, and other sources
2. Uses Claude AI to classify, assess severity, and translate to Arabic
3. Pushes relevant incidents as **drafts** to the admin panel
4. You review and publish from the admin panel

## Setup

### Environment Variables

```bash
export ANTHROPIC_API_KEY="sk-ant-..."  # Required for LLM translation
export GLITCH_API_BASE="http://localhost:5000"  # Your API server
```

### Run Manually

```bash
cd /home/user/workspace/glitch-report
python automation/ingest.py
```

### Run on Schedule (cron)

Add to your crontab to run every 6 hours:

```
0 */6 * * * cd /path/to/glitch-report && ANTHROPIC_API_KEY=sk-ant-... python automation/ingest.py >> /var/log/glitch-ingest.log 2>&1
```

## Data Sources

| Source | Category | Feed |
|--------|----------|------|
| AI Incident Database | AI | RSS |
| MIT Tech Review | AI | RSS |
| TechCrunch AI | AI | RSS |
| CoinDesk | Crypto | RSS |
| CoinTelegraph | Crypto | RSS |
| BleepingComputer | IoT/Security | RSS |
| Krebs on Security | IoT/Security | RSS |
| The Hacker News | IoT/Security | RSS |
| Hacker News (Algolia) | Mixed | API |

## How It Works

1. **Fetch**: Pulls latest articles from all configured RSS feeds and HN
2. **Deduplicate**: Maintains a local SQLite DB of seen article URLs to avoid duplicates
3. **Classify**: Sends each article to Claude which:
   - Determines if it's relevant (failure/scam/incident vs. general news)
   - Classifies into ai/crypto/iot
   - Assesses severity (low/medium/high/critical)
   - Extracts loss amounts
   - Translates title and description to Arabic
   - Generates relevant Arabic tags
4. **Push**: Creates incidents as **drafts** in the admin panel
5. **Review**: You publish or edit from the admin panel at `/#/admin`

## Adding New Sources

Edit `fetch_rss_feeds()` in `ingest.py` to add new RSS feeds:

```python
{"url": "https://example.com/feed.xml", "category_hint": "ai", "source_name": "Example Source"},
```

## Cost Estimate

- ~$0.01-0.03 per article classified (Claude Sonnet)
- ~30 articles per run × 4 runs/day = ~120 articles/day
- ~$1.20-3.60/day in LLM costs
- ~$36-108/month
