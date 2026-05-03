#!/usr/bin/env python3
"""
fetch_news.py — Saszik Lab site
Fetches RSS feeds from science news sources, filters by research keywords,
and writes data/laymans-articles.json.

Called by: .github/workflows/citations-fetch.yml (monthly + manual dispatch)
Reads:     data/config.json
Writes:    data/laymans-articles.json

Usage:
    python3 scripts/fetch_news.py

Exit codes:
    0 — success (file written or no change needed)
    1 — total failure (all sources exhausted, no data produced)
"""

import json
import os
import re
import sys
import time
import datetime
import html
from pathlib import Path
from xml.etree import ElementTree

try:
    import requests
except ImportError:
    print("[ERROR] 'requests' is not installed. Run: pip install requests")
    sys.exit(1)


# ── Paths ──────────────────────────────────────────────────────────────────────

REPO_ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = REPO_ROOT / "data" / "config.json"
OUTPUT_PATH = REPO_ROOT / "data" / "laymans-articles.json"


# ── RSS Feed Sources ───────────────────────────────────────────────────────────

RSS_FEEDS = [
    {
        "name": "Neuroscience News",
        "url": "https://neurosciencenews.com/feed/",
    },
    {
        "name": "Quanta Magazine",
        "url": "https://www.quantamagazine.org/feed/",
    },
    {
        "name": "Science Daily",
        "url": "https://www.sciencedaily.com/rss/mind_brain/neuroscience.xml",
    },
    {
        "name": "EurekAlert!",
        "url": "https://www.eurekalert.org/rss.xml",
    },
]


# ── Load config ────────────────────────────────────────────────────────────────

def load_config():
    if not CONFIG_PATH.exists():
        print(f"[ERROR] config.json not found at {CONFIG_PATH}")
        sys.exit(1)
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


# ── HTML/XML helpers ───────────────────────────────────────────────────────────

def strip_html(text: str) -> str:
    """Remove HTML tags and decode entities."""
    if not text:
        return ""
    # Remove CDATA wrapper
    text = re.sub(r'<!\[CDATA\[(.*?)\]\]>', r'\1', text, flags=re.DOTALL)
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Decode HTML entities
    text = html.unescape(text)
    # Normalize whitespace
    text = ' '.join(text.split())
    return text.strip()


def truncate(text: str, max_len: int = 200) -> str:
    """Truncate text to max_len chars, adding ellipsis if needed."""
    text = strip_html(text)
    if len(text) <= max_len:
        return text
    return text[:max_len].rsplit(' ', 1)[0] + '...'


def parse_date(date_str: str) -> str:
    """Parse various date formats and return ISO format."""
    if not date_str:
        return ""

    # Common RSS date formats
    formats = [
        "%a, %d %b %Y %H:%M:%S %z",      # RFC 2822: "Mon, 01 Jan 2026 12:00:00 +0000"
        "%a, %d %b %Y %H:%M:%S %Z",      # With timezone name
        "%Y-%m-%dT%H:%M:%S%z",           # ISO 8601
        "%Y-%m-%dT%H:%M:%SZ",            # ISO 8601 UTC
        "%Y-%m-%d %H:%M:%S",             # Simple datetime
        "%Y-%m-%d",                       # Simple date
    ]

    for fmt in formats:
        try:
            dt = datetime.datetime.strptime(date_str.strip(), fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue

    # Fallback: try to extract date pattern
    match = re.search(r'(\d{4})-(\d{2})-(\d{2})', date_str)
    if match:
        return match.group(0)

    return ""


# ── Keyword matching ───────────────────────────────────────────────────────────

def get_keywords(config: dict) -> list[str]:
    """Extract keywords from both research and citations sections."""
    keywords = []

    # Research keywords
    research_kw = config.get("research", {}).get("keywords", [])
    keywords.extend(research_kw)

    # Citation keywords
    citation_kw = config.get("citations", {}).get("keywords", [])
    keywords.extend(citation_kw)

    # Deduplicate and lowercase
    seen = set()
    result = []
    for kw in keywords:
        kw_lower = kw.lower().strip()
        if kw_lower and kw_lower not in seen:
            seen.add(kw_lower)
            result.append(kw_lower)

    return result


def score_article(title: str, description: str, keywords: list[str]) -> int:
    """
    Score an article by counting keyword matches in title and description.
    Title matches count double.
    Returns 0 if no keywords match.
    """
    title_lower = title.lower()
    desc_lower = description.lower()
    score = 0

    for kw in keywords:
        # Check for partial word matches (e.g., "zebrafish" in "zebrafish visual system")
        kw_words = kw.split()

        for word in kw_words:
            if len(word) >= 4:  # Only match substantial words
                if word in title_lower:
                    score += 2  # Title matches count double
                if word in desc_lower:
                    score += 1

        # Also check full phrase
        if kw in title_lower:
            score += 3
        if kw in desc_lower:
            score += 1

    return score


# ── RSS Parsing ────────────────────────────────────────────────────────────────

def fetch_rss(url: str, source_name: str, timeout: int = 15) -> list[dict]:
    """
    Fetch and parse an RSS feed.
    Returns a list of article dicts.
    """
    headers = {
        "User-Agent": "SaszykLabSite/1.0 (Academic research site; news aggregation)"
    }

    try:
        resp = requests.get(url, headers=headers, timeout=timeout)
        resp.raise_for_status()

        # Parse XML
        root = ElementTree.fromstring(resp.content)

        articles = []

        # Handle both RSS 2.0 and Atom feeds
        # RSS 2.0: channel/item
        for item in root.findall('.//item'):
            article = parse_rss_item(item, source_name)
            if article:
                articles.append(article)

        # Atom: entry
        for entry in root.findall('.//{http://www.w3.org/2005/Atom}entry'):
            article = parse_atom_entry(entry, source_name)
            if article:
                articles.append(article)

        return articles

    except Exception as e:
        print(f"    [WARN] Failed to fetch {source_name}: {e}")
        return []


def extract_date_from_url(url: str) -> str:
    """Extract date from ScienceDaily URLs like /releases/2026/03/260312...htm → 2026-03-12."""
    # ScienceDaily filename format: YYMMDD... (skip 4 chars YYMM, capture DD)
    match = re.search(r'/releases/(\d{4})/(\d{2})/\d{4}(\d{2})', url)
    if match:
        return f"{match.group(1)}-{match.group(2)}-{match.group(3)}"
    match = re.search(r'/releases/(\d{4})/(\d{2})/', url)
    if match:
        return f"{match.group(1)}-{match.group(2)}-01"
    return ""


def parse_rss_item(item: ElementTree.Element, source_name: str) -> dict | None:
    """Parse an RSS 2.0 item element."""
    title_el = item.find('title')
    link_el = item.find('link')
    desc_el = item.find('description')
    date_el = item.find('pubDate')
    # Fallback: dc:date namespace
    if date_el is None:
        date_el = item.find('{http://purl.org/dc/elements/1.1/}date')

    title = strip_html(title_el.text if title_el is not None and title_el.text else "")
    if not title:
        return None

    url = link_el.text.strip() if link_el is not None and link_el.text else ""
    date = parse_date(date_el.text if date_el is not None and date_el.text else "")
    if not date and url:
        date = extract_date_from_url(url)

    return {
        "title": title,
        "source": source_name,
        "url": url,
        "date": date,
        "summary": truncate(desc_el.text if desc_el is not None and desc_el.text else "", 200),
        "language": "en",  # All our RSS sources are English-language publications
    }


def parse_atom_entry(entry: ElementTree.Element, source_name: str) -> dict | None:
    """Parse an Atom entry element."""
    ns = {'atom': 'http://www.w3.org/2005/Atom'}

    title_el = entry.find('atom:title', ns)
    link_el = entry.find('atom:link[@rel="alternate"]', ns)
    if link_el is None:
        link_el = entry.find('atom:link', ns)
    summary_el = entry.find('atom:summary', ns)
    if summary_el is None:
        summary_el = entry.find('atom:content', ns)
    date_el = entry.find('atom:published', ns)
    if date_el is None:
        date_el = entry.find('atom:updated', ns)

    title = strip_html(title_el.text if title_el is not None and title_el.text else "")
    if not title:
        return None

    url = ""
    if link_el is not None:
        url = link_el.get('href', '') or (link_el.text or "").strip()

    return {
        "title": title,
        "source": source_name,
        "url": url,
        "date": parse_date(date_el.text if date_el is not None and date_el.text else ""),
        "summary": truncate(summary_el.text if summary_el is not None and summary_el.text else "", 200),
        "language": "en",  # All our RSS sources are English-language publications
    }


# ── Main fetch logic ───────────────────────────────────────────────────────────

def fetch_all(config: dict) -> list[dict]:
    """
    Fetch all RSS feeds, filter by keywords, score, sort, and return top 15.
    """
    keywords = get_keywords(config)
    print(f"  Keywords ({len(keywords)}): {', '.join(keywords[:5])}...")

    all_articles = []

    for i, feed in enumerate(RSS_FEEDS):
        if i > 0:
            time.sleep(0.5)  # Polite delay between requests

        print(f"  → Fetching: {feed['name']}")
        articles = fetch_rss(feed['url'], feed['name'])
        print(f"    Retrieved {len(articles)} articles")
        all_articles.extend(articles)

    print(f"\n  Total raw articles: {len(all_articles)}")

    # Score all articles (keyword matches get higher scores)
    scored = []
    for article in all_articles:
        score = score_article(article['title'], article['summary'], keywords)
        article['_score'] = score
        scored.append(article)

    matching_count = sum(1 for a in scored if a['_score'] > 0)
    print(f"  Articles matching keywords: {matching_count}")

    # Sort by score (desc), then by date (desc)
    scored.sort(key=lambda a: (-a['_score'], a.get('date', '') or ''), reverse=False)
    scored.sort(key=lambda a: a['_score'], reverse=True)

    # Remove internal score field and take top 15
    result = []
    seen_urls = set()
    for article in scored:
        # Deduplicate by URL
        url = article.get('url', '')
        if url and url in seen_urls:
            continue
        if url:
            seen_urls.add(url)

        del article['_score']
        result.append(article)

        if len(result) >= 15:
            break

    print(f"  Final articles (top 15): {len(result)}")
    return result


# ── Write output ───────────────────────────────────────────────────────────────

def write_output(articles: list[dict]) -> None:
    payload = {
        "generated_at": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": "rss_feeds",
        "feed_sources": [f["name"] for f in RSS_FEEDS],
        "results": articles,
    }
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
    print(f"\n✓ Written to {OUTPUT_PATH}")


# ── Entry point ────────────────────────────────────────────────────────────────

def main():
    print("=== fetch_news.py ===")
    print(f"Config:  {CONFIG_PATH}")
    print(f"Output:  {OUTPUT_PATH}\n")

    config = load_config()
    articles = fetch_all(config)

    if not articles:
        print("\n[WARNING] No matching articles found.")
        print("Preserving existing laymans-articles.json (if any).")
        sys.exit(0)

    write_output(articles)
    print(f"Articles: {len(articles)}")


if __name__ == "__main__":
    main()
