#!/usr/bin/env python3
"""
fetch_citations.py — Saszik Lab site
Queries OpenAlex (primary) or Semantic Scholar (fallback) for recent publications
matching the lab's research keywords, then writes data/citations.json.

Called by: .github/workflows/citations-fetch.yml (monthly + manual dispatch)
Reads:     data/config.json
Writes:    data/citations.json

Usage:
    python3 scripts/fetch_citations.py

Exit codes:
    0 — success (file written or no change needed)
    1 — total failure (all sources exhausted, no data produced)
"""

import json
import os
import sys
import time
import datetime
from pathlib import Path

try:
    import requests
except ImportError:
    print("[ERROR] 'requests' is not installed. Run: pip install requests")
    sys.exit(1)


# ── Paths ──────────────────────────────────────────────────────────────────────

REPO_ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = REPO_ROOT / "data" / "config.json"
OUTPUT_PATH = REPO_ROOT / "data" / "citations.json"


# ── Load config ────────────────────────────────────────────────────────────────

def load_config():
    if not CONFIG_PATH.exists():
        print(f"[ERROR] config.json not found at {CONFIG_PATH}")
        sys.exit(1)
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


# ── Filtering helpers ──────────────────────────────────────────────────────────

def is_excluded_title(title: str, exclude_keywords: list[str]) -> bool:
    t = title.lower()
    return any(kw.lower() in t for kw in exclude_keywords)


def is_excluded_doi(doi: str, exclude_prefixes: list[str]) -> bool:
    if not doi:
        return False
    return any(doi.startswith(p) for p in exclude_prefixes)


# ── OpenAlex ───────────────────────────────────────────────────────────────────

OPENALEX_BASE = "https://api.openalex.org/works"

def build_user_agent(contact_email: str) -> str:
    return f"SaszykLabSite/1.0 (mailto:{contact_email})"


def fetch_openalex_keyword(
    keyword: str,
    min_year: int,
    max_results: int,
    user_agent: str,
    timeout: int = 10,
) -> list[dict]:
    """
    Query OpenAlex for works matching a keyword phrase.
    Returns a list of normalized citation dicts.
    """
    params = {
        "search": keyword,
        "filter": f"publication_year:>{min_year - 1},language:en",
        "sort": "publication_year:desc",
        "per_page": min(max_results, 25),
        "select": "id,title,authorships,primary_location,publication_year,doi,open_access,ids,abstract_inverted_index,language",
    }
    headers = {"User-Agent": user_agent}
    resp = requests.get(OPENALEX_BASE, params=params, headers=headers, timeout=timeout)
    resp.raise_for_status()
    data = resp.json()
    results = []
    for work in data.get("results", []):
        normalized = normalize_openalex(work, keyword)
        if normalized:
            results.append(normalized)
    return results


def normalize_openalex(work: dict, matched_keyword: str) -> dict | None:
    """Convert an OpenAlex work object to the citations.json schema."""
    title = (work.get("title") or "").strip()
    if not title:
        return None

    year = work.get("publication_year")
    doi_raw = work.get("doi") or ""
    doi = doi_raw.replace("https://doi.org/", "").strip() if doi_raw else ""
    oa_url = (work.get("open_access") or {}).get("oa_url")
    url = oa_url or (f"https://doi.org/{doi}" if doi else (work.get("id") or ""))

    # PubMed ID
    pmid_raw = (work.get("ids") or {}).get("pmid") or ""
    pmid = pmid_raw.replace("https://pubmed.ncbi.nlm.nih.gov/", "").strip("/") if pmid_raw else ""
    pubmed_url = f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/" if pmid else ""

    # Authors
    authors = []
    for auth in work.get("authorships", []):
        name = (auth.get("author") or {}).get("display_name") or ""
        if name:
            authors.append(name)

    # Venue
    venue = ""
    loc = work.get("primary_location") or {}
    source = loc.get("source") or {}
    venue = (source.get("display_name") or "").strip()

    # Abstract (inverted index → plain text)
    abstract = reconstruct_abstract(work.get("abstract_inverted_index"))

    language = (work.get("language") or "").strip().lower()

    return {
        "title": title,
        "authors": authors,
        "venue": venue,
        "year": year,
        "doi": doi,
        "url": url,
        "pmid": pmid,
        "pubmed_url": pubmed_url,
        "abstract": abstract,
        "language": language,
        "matched_keyword": matched_keyword,
        "source": "openalex",
    }


def reconstruct_abstract(inv_index: dict | None) -> str:
    """OpenAlex stores abstracts as inverted index {word: [positions]}."""
    if not inv_index:
        return ""
    try:
        max_pos = max(pos for positions in inv_index.values() for pos in positions)
        words = [""] * (max_pos + 1)
        for word, positions in inv_index.items():
            for pos in positions:
                words[pos] = word
        return " ".join(w for w in words if w)
    except Exception:
        return ""


# ── Semantic Scholar fallback ──────────────────────────────────────────────────

SS_BASE = "https://api.semanticscholar.org/graph/v1/paper/search"

def fetch_semantic_scholar_keyword(
    keyword: str,
    min_year: int,
    max_results: int,
    timeout: int = 10,
) -> list[dict]:
    """
    Fallback: query Semantic Scholar for a keyword.
    Returns normalized citation dicts.
    """
    params = {
        "query": keyword,
        "fields": "title,authors,venue,year,externalIds,abstract",
        "limit": min(max_results, 20),
    }
    resp = requests.get(SS_BASE, params=params, timeout=timeout)
    resp.raise_for_status()
    data = resp.json()
    results = []
    for paper in data.get("data", []):
        if (paper.get("year") or 0) < min_year:
            continue
        normalized = normalize_semantic_scholar(paper, keyword)
        if normalized:
            results.append(normalized)
    return results


def normalize_semantic_scholar(paper: dict, matched_keyword: str) -> dict | None:
    title = (paper.get("title") or "").strip()
    if not title:
        return None

    authors = [a.get("name", "") for a in (paper.get("authors") or []) if a.get("name")]
    ext_ids = paper.get("externalIds") or {}
    doi = ext_ids.get("DOI", "")
    url = f"https://doi.org/{doi}" if doi else ""
    pmid = str(ext_ids.get("PubMed", "")).strip()
    pubmed_url = f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/" if pmid else ""

    return {
        "title": title,
        "authors": authors,
        "venue": (paper.get("venue") or "").strip(),
        "year": paper.get("year"),
        "doi": doi,
        "url": url,
        "pmid": pmid,
        "pubmed_url": pubmed_url,
        "abstract": (paper.get("abstract") or "").strip(),
        "matched_keyword": matched_keyword,
        "source": "semantic_scholar",
    }


# ── Main fetch logic ───────────────────────────────────────────────────────────

def fetch_all(config: dict) -> tuple[list[dict], str]:
    """
    Iterate over keywords, fetch from OpenAlex (or Semantic Scholar on failure),
    deduplicate by DOI, apply filters, trim to max_results_total.
    Returns (results, source_used).
    """
    citations_cfg = config["citations"]
    profile = config.get("profile", {})
    keywords = citations_cfg["keywords"]
    min_year = citations_cfg.get("min_year", 2022)
    max_per_kw = citations_cfg.get("max_results_per_keyword", 6)
    max_total = citations_cfg.get("max_results_total", 24)
    exclude_title_kws = [kw.lower() for kw in citations_cfg.get("exclude_keywords_in_title", [])]
    exclude_doi_prefixes = citations_cfg.get("exclude_doi_prefixes", [])
    contact_email = profile.get("contact_email", "lab@example.edu")
    user_agent = build_user_agent(contact_email)

    seen_dois = set()
    all_results = []
    source_used = "openalex"

    for i, keyword in enumerate(keywords):
        if i > 0:
            time.sleep(0.5)  # polite delay between requests

        print(f"  → Querying: {keyword!r}")
        entries = []

        # Try OpenAlex first
        try:
            entries = fetch_openalex_keyword(keyword, min_year, max_per_kw, user_agent)
            print(f"    OpenAlex: {len(entries)} results")
        except Exception as e:
            print(f"    OpenAlex failed ({e}), trying Semantic Scholar...")
            source_used = "semantic_scholar"
            try:
                entries = fetch_semantic_scholar_keyword(keyword, min_year, max_per_kw)
                print(f"    Semantic Scholar: {len(entries)} results")
            except Exception as e2:
                print(f"    Semantic Scholar also failed ({e2}), skipping keyword.")
                continue

        # Deduplicate and filter
        for entry in entries:
            doi = entry.get("doi", "").strip()
            title = entry.get("title", "")
            if doi and doi in seen_dois:
                continue
            if is_excluded_title(title, exclude_title_kws):
                print(f"    Excluded by title filter: {title[:60]}")
                continue
            if doi and is_excluded_doi(doi, exclude_doi_prefixes):
                print(f"    Excluded by DOI prefix: {doi}")
                continue
            if doi:
                seen_dois.add(doi)
            all_results.append(entry)

    # Sort: year desc, then title asc
    all_results.sort(key=lambda r: (-int(r.get("year") or 0), (r.get("title") or "").lower()))

    # Trim
    trimmed = all_results[:max_total]
    print(f"\n  Total unique results: {len(all_results)} → trimmed to {len(trimmed)}")
    return trimmed, source_used


# ── Write output ───────────────────────────────────────────────────────────────

def write_output(results: list[dict], source_used: str, config: dict) -> None:
    citations_cfg = config["citations"]
    payload = {
        "generated_at": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": source_used,
        "query_summary": ", ".join(citations_cfg["keywords"]),
        "results": results,
    }
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
    print(f"\n✓ Written to {OUTPUT_PATH}")


# ── Entry point ────────────────────────────────────────────────────────────────

def main():
    print("=== fetch_citations.py ===")
    print(f"Config:  {CONFIG_PATH}")
    print(f"Output:  {OUTPUT_PATH}\n")

    config = load_config()
    print(f"Keywords ({len(config['citations']['keywords'])}):")

    results, source_used = fetch_all(config)

    if not results:
        print("\n[WARNING] No results returned from any source.")
        print("Preserving existing citations.json (if any) to avoid breaking the site.")
        # Do not overwrite with empty data — exit 0 so the workflow doesn't fail
        sys.exit(0)

    write_output(results, source_used, config)
    print(f"Source: {source_used}")
    print(f"Results: {len(results)}")


if __name__ == "__main__":
    main()
