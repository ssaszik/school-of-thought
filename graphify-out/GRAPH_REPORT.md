# Graph Report - .  (2026-04-23)

## Corpus Check
- 10 files · ~15,000 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 123 nodes · 212 edges · 12 communities detected
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_News RSS Fetching|News RSS Fetching]]
- [[_COMMUNITY_OpenAlex Citation Fetching|OpenAlex Citation Fetching]]
- [[_COMMUNITY_Citations JS Renderer|Citations JS Renderer]]
- [[_COMMUNITY_Docs & Site Architecture|Docs & Site Architecture]]
- [[_COMMUNITY_Citation Fetch Pipeline|Citation Fetch Pipeline]]
- [[_COMMUNITY_Admin Panel UI|Admin Panel UI]]
- [[_COMMUNITY_Navigation & Menu|Navigation & Menu]]
- [[_COMMUNITY_Site Page Structure|Site Page Structure]]
- [[_COMMUNITY_Theme System|Theme System]]
- [[_COMMUNITY_Dev Guidelines|Dev Guidelines]]
- [[_COMMUNITY_Code Refactors|Code Refactors]]
- [[_COMMUNITY_Placeholder Markers|Placeholder Markers]]

## God Nodes (most connected - your core abstractions)
1. `fetch_all()` - 9 edges
2. `parse_rss_item()` - 7 edges
3. `parse_atom_entry()` - 7 edges
4. `fetch_all()` - 7 edges
5. `loadAcademicCitations()` - 7 edges
6. `Site Architecture` - 6 edges
7. `strip_html()` - 6 edges
8. `truncate()` - 6 edges
9. `fetch_rss()` - 6 edges
10. `loadNewsArticles()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Citation-fetch Pipeline` --references--> `Fabricated Seed Citations (to replace)`  [INFERRED]
  README.md → Website_Setup_Instructions.pdf
- `Citation-fetch Pipeline` --references--> `Citation Keywords Configuration`  [EXTRACTED]
  README.md → Website_Setup_Instructions.pdf
- `Site Architecture` --conceptually_related_to--> `DOM Element Caching Refactor`  [INFERRED]
  README.md → REFACTOR_PROGRESS.md
- `Site Architecture` --conceptually_related_to--> `Robots.txt Crawl Configuration`  [INFERRED]
  README.md → robots.txt
- `Academic Citations List (#citations-list-academic)` --conceptually_related_to--> `Theme System Pattern (FOUC prevention)`  [AMBIGUOUS]
  index.html → CLAUDE.md

## Hyperedges (group relationships)
- **pubs-related-controls Flex Container: Tabs + Lang Toggle** — index_pubs_related_controls, index_lit_tabs, index_lang_toggle [EXTRACTED 1.00]
- **Admin Authentication Flow: 5-Click → Modal → PAT → Drawer** — index_five_click_trigger, index_admin_modal, index_admin_pat_auth, index_admin_drawer [EXTRACTED 1.00]
- **Literature Tab System: Tabs + Academic Panel + News Panel** — index_lit_tabs, index_panel_academic, index_panel_news, index_lit_tab_btn, index_lit_tab_panel [EXTRACTED 1.00]
- **Admin Security: PAT-in-memory + Idle Timeout + No Persistence** — index_admin_pat_security, index_idle_timeout, index_five_click_trigger [EXTRACTED 0.95]
- **Admin Drawer Editing: Keyword Chips + Description Textarea + GitHub API** — index_admin_keyword_chips, index_admin_description_textarea, index_github_api_integration [EXTRACTED 1.00]

## Communities

### Community 0 - "News RSS Fetching"
Cohesion: 0.19
Nodes (21): fetch_all(), fetch_rss(), get_keywords(), load_config(), main(), parse_atom_entry(), parse_date(), parse_rss_item() (+13 more)

### Community 1 - "OpenAlex Citation Fetching"
Cohesion: 0.23
Nodes (17): build_user_agent(), fetch_all(), fetch_openalex_keyword(), fetch_semantic_scholar_keyword(), is_excluded_doi(), is_excluded_title(), load_config(), main() (+9 more)

### Community 2 - "Citations JS Renderer"
Cohesion: 0.33
Nodes (15): createAcademicCitationElement(), createNewsElement(), formatDate(), formatShortDate(), getFilteredAcademicResults(), getFilteredNewsResults(), initTabs(), loadAcademicCitations() (+7 more)

### Community 3 - "Docs & Site Architecture"
Cohesion: 0.17
Nodes (16): Site Architecture Overview, Citation Pipeline Pattern, Theme System Pattern (FOUC prevention), Academic Citations List (#citations-list-academic), News Citations List (#citations-list-news), English Toggle Checkbox (#lang-en-toggle), English-Only Language Toggle (.lang-toggle), Literature Tab Button (.lit-tab-btn) (+8 more)

### Community 4 - "Citation Fetch Pipeline"
Cohesion: 0.18
Nodes (11): Citation-fetch Pipeline, GitHub Actions Monthly Citation Workflow, OpenAlex API Integration, Semantic Scholar Fallback, Citation Keywords Configuration, CV PDF Asset Requirement, Fabricated Seed Citations (to replace), ORCID Placeholder Value (+3 more)

### Community 5 - "Admin Panel UI"
Cohesion: 0.27
Nodes (11): Research Description Textarea (#adminDescription), Admin Drawer (#adminDrawer), Admin Keyword Chips (#adminKeywordChips), Admin Authentication Modal (#adminModal), Admin Panel System, PAT Authentication Logic, PAT Security — In-Memory Only (Never Persisted), Base64 UTF-8 Decode Fix (decodeURIComponent + escape) (+3 more)

### Community 6 - "Navigation & Menu"
Cohesion: 0.54
Nodes (6): closeMenu(), getFocusable(), openMenu(), smoothScrollTo(), toggleMenu(), updateHeaderScroll()

### Community 7 - "Site Page Structure"
Cohesion: 0.25
Nodes (8): 404 Error Page, Site Architecture, CSS Design Tokens System, Dark/Light Mode Theme System, Rationale: No Framework Decision, Scroll Reveal Animations, DOM Element Caching Refactor, Robots.txt Crawl Configuration

### Community 8 - "Theme System"
Cohesion: 0.67
Nodes (4): applyTheme(), getPreferredTheme(), syncToggleButton(), toggleTheme()

### Community 9 - "Dev Guidelines"
Cohesion: 1.0
Nodes (2): Project Overview — CLAUDE.md, 3-Layer Query Rule (graph → grep → raw file)

### Community 10 - "Code Refactors"
Cohesion: 1.0
Nodes (1): SKELETON_COUNT Constant Refactor

### Community 11 - "Placeholder Markers"
Cohesion: 1.0
Nodes (1): Placeholder Markers (TK / developer to replace / verify)

## Ambiguous Edges - Review These
- `Academic Citations List (#citations-list-academic)` → `Theme System Pattern (FOUC prevention)`  [AMBIGUOUS]
  CLAUDE.md · relation: conceptually_related_to

## Knowledge Gaps
- **40 isolated node(s):** `Query OpenAlex for works matching a keyword phrase.     Returns a list of normal`, `Convert an OpenAlex work object to the citations.json schema.`, `OpenAlex stores abstracts as inverted index {word: [positions]}.`, `Fallback: query Semantic Scholar for a keyword.     Returns normalized citation`, `Iterate over keywords, fetch from OpenAlex (or Semantic Scholar on failure),` (+35 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Dev Guidelines`** (2 nodes): `Project Overview — CLAUDE.md`, `3-Layer Query Rule (graph → grep → raw file)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Code Refactors`** (1 nodes): `SKELETON_COUNT Constant Refactor`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Placeholder Markers`** (1 nodes): `Placeholder Markers (TK / developer to replace / verify)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Academic Citations List (#citations-list-academic)` and `Theme System Pattern (FOUC prevention)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What connects `Query OpenAlex for works matching a keyword phrase.     Returns a list of normal`, `Convert an OpenAlex work object to the citations.json schema.`, `OpenAlex stores abstracts as inverted index {word: [positions]}.` to the rest of the system?**
  _40 weakly-connected nodes found - possible documentation gaps or missing edges._