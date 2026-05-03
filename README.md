# Saszik Lab — Developer README

Academic website for **Dr. Shannon Saszik**, Associate Professor & Department Chair,
Department of Psychology, Northeastern Illinois University.

> **Audience:** This document is for the developer managing the site. The professor
> does not interact with the repository, run GitHub Actions, or configure any settings.

---

## Project overview

| Item | Detail |
|---|---|
| **Stack** | Vanilla HTML5 + CSS (custom properties, grid, flexbox) + vanilla ES modules |
| **Hosting** | GitHub Pages (free, HTTPS, CDN) |
| **CI/CD** | GitHub Actions — monthly cron to refresh `data/citations.json` |
| **Citation source** | OpenAlex (primary, free, no API key); Semantic Scholar (fallback) |
| **Fonts** | Google Fonts: Inter (UI), Fraunces (display) |
| **Icons** | Phosphor Icons via CDN |
| **Build step** | None — GitHub Pages serves the repo root directly |
| **Estimated annual cost** | ~$12/yr (domain only; everything else is free) |

---

## Local development

```bash
# Clone the repo
git clone https://github.com/your-username/saszik-lab-site.git
cd saszik-lab-site

# Serve locally (Python 3 is all you need — no npm install, no build step)
python3 -m http.server 8000

# Open in browser
open http://localhost:8000
```

Because the JS modules use `fetch('./data/citations.json')`, the site must be served
over HTTP (not opened as a file://). The Python server above satisfies this requirement.

---

## Architecture

```
saszik-lab-site/
├── index.html              Single-page site — all sections in one document
├── 404.html                GitHub Pages auto-serves this for unmatched paths
├── robots.txt / sitemap.xml
│
├── assets/
│   ├── css/style.css       All styles — mobile-first, custom properties, no framework
│   ├── js/
│   │   ├── main.js         Nav, scroll, animations, mobile menu, copy-email, footer year
│   │   ├── citations.js    Renders data/citations.json into #citations-list
│   │   └── theme.js        Dark/light mode — runs pre-paint in <head>
│   ├── images/             Portrait, OG image, lab-hero, member photos
│   ├── pdfs/               cv.pdf + syllabi/
│   └── icons/              favicon.svg, favicon-32.png, apple-touch-icon.png
│
├── data/
│   ├── config.json         Developer-controlled: keywords, profile, fetch params
│   └── citations.json      Auto-generated monthly by GitHub Actions; committed to repo
│
├── scripts/
│   └── fetch_citations.py  Called by GitHub Actions; writes citations.json
│
└── .github/workflows/
    └── citations-fetch.yml Monthly cron (1st of month, 08:00 UTC) + workflow_dispatch
```

### Why no framework?

The site is a single content-dominant page with no shared components that change
frequently. Skipping a framework means no Node version pinning, no `npm install` in CI,
no `dist/` confusion, and no broken deploys from dependency bumps. If the site grows to
10+ pages with a markdown blog, migrate to Astro (see Future upgrade paths below).

### CSS design tokens

All colors, typography, spacing, and shadows are defined as CSS custom properties
in `:root` (light theme) and overridden in `[data-theme="dark"]` (dark theme) at the
top of `style.css`. To change the accent color for the whole site, update
`--color-accent` and `--color-accent-soft` in both blocks.

### Dark/light mode

`theme.js` runs as a module in `<head>` — before any paint — to prevent flash of
unstyled content (FOUC). It checks `localStorage.theme` first, then falls back to
`prefers-color-scheme`. The user's choice is persisted to `localStorage`.

### Scroll reveal animations

Any element with the `[data-animate]` attribute starts invisible (`opacity: 0`,
translated 12px down) and fades in when it enters the viewport. An
`IntersectionObserver` in `main.js` handles this. The CSS stagger classes in
`style.css` delay children within `[data-animate-stagger]` containers by 60ms each.
Both transforms and animations respect `prefers-reduced-motion: reduce`.

---

## Citation-fetch pipeline

### How it works

1. **Trigger** — GitHub Actions runs `scripts/fetch_citations.py` on the 1st of each
   month at 08:00 UTC, and on `workflow_dispatch` (manual runs via the Actions tab).

2. **Input** — The script reads `data/config.json` for keywords, date range, and
   filter rules.

3. **OpenAlex query** — Each keyword is queried independently against the OpenAlex
   `/works` endpoint with a polite `User-Agent` header that includes the
   `profile.contact_email` from `config.json`. OpenAlex's "polite pool" gives better
   throughput for requests that identify themselves with a contact email.

4. **Deduplication** — Results are deduplicated by DOI across all keyword queries.
   Papers matching `exclude_keywords_in_title` (case-insensitive) — like "erratum" or
   "correction" — are dropped.

5. **Fallback** — If the OpenAlex request for any keyword fails (network error, HTTP
   error, timeout), the script retries that keyword against Semantic Scholar.

6. **Output** — Results are sorted by year (desc) then title (asc) and trimmed to
   `max_results_total`. The script writes `data/citations.json` in stable, pretty-printed
   JSON format.

7. **Commit** — The workflow detects whether `citations.json` actually changed. If it
   did, it commits and pushes as `github-actions[bot]` with message
   `chore(citations): monthly refresh YYYY-MM`. If nothing changed, no commit is made.

8. **Rendering** — `assets/js/citations.js` fetches `./data/citations.json` on
   `DOMContentLoaded` and renders entries into the `#citations-list` container with
   title (linked to DOI), authors (up to 6, then "et al."), venue + year, keyword chip,
   and external link.

### citations.json schema

```json
{
  "generated_at": "2026-04-01T08:00:00Z",
  "source": "openalex",
  "query_summary": "zebrafish visual system, ...",
  "results": [
    {
      "title": "...",
      "authors": ["Jane Doe", "John Smith"],
      "venue": "Visual Neuroscience",
      "year": 2025,
      "doi": "10.1017/S0952523825000012",
      "url": "https://doi.org/10.1017/S0952523825000012",
      "abstract": "...",
      "matched_keyword": "zebrafish visual system",
      "source": "openalex"
    }
  ]
}
```

### Idempotency

The script exits 0 even if no results are returned (to avoid failing the CI job and
creating noise). It only overwrites `citations.json` when it has real data to write —
so the site always has at least the seed file to render.

---

## How to change research keywords

1. Edit `data/config.json` — update the `citations.keywords` array.
2. Commit the change and push to `main`.
3. Optionally trigger the workflow manually: Actions tab → "Monthly citation fetch" →
   "Run workflow" → confirm the commit lands.

---

## How to swap placeholder assets

| Asset | Path | Notes |
|---|---|---|
| Professor portrait | `assets/images/professor.jpg` | ~2000×2500px, sRGB JPG, `object-position: center 20%` |
| OG/social share card | `assets/images/og-image.jpg` | 1200×630px |
| CV PDF | `assets/pdfs/cv.pdf` | Replaces the inline `<object>` preview and download button |
| Syllabi | `assets/pdfs/syllabi/psyc-202-fall2026.pdf` etc. | Filenames must match the `href` attrs in the Teaching section |
| Favicon | `assets/icons/favicon.svg` | Also replace `favicon-32.png` and `apple-touch-icon.png` |
| Member photos | `assets/images/members/member-1.jpg` … | 80×80px, circular crop applied via CSS |

---

## How to add or remove selected publications

The selected publications list is hand-coded in `index.html` in the `#publications`
section, inside the `.pub-year-group` blocks. To add a publication:

1. Find the appropriate year group (or add a new `<div class="pub-year-group">` block).
2. Add a new `<li class="pub-item">` with the APA-formatted citation.
3. Include a `<a class="pub-doi-link" href="...">DOI</a>` link if available.
4. Mark uncertain DOIs with `<!-- verify -->`.

To remove a publication, delete the `<li>` element.

---

## Deployment

### GitHub Pages

1. Repo must be public for unlimited free GitHub Actions minutes (or a paid account for
   private repos).
2. Settings → Pages → Source: **Deploy from a branch** → `main` / `/ (root)` → Save.
3. The site is live at `https://username.github.io/saszik-lab-site/` (or
   `https://username.github.io/` if the repo is named `username.github.io`).

> **Subpath note:** If the repo is named `saszik-lab-site`, the site deploys at a
> subpath (`/saszik-lab-site/`). All asset paths in this codebase are **relative**
> (e.g., `assets/css/style.css`, not `/assets/…`), so subpath deployment works
> without any config change.

### GitHub Actions write permissions

The monthly workflow must commit `citations.json` back to `main`. For this to work:

Settings → Actions → General → **Workflow permissions** → select
**"Read and write permissions"** → Save.

Without this, the commit step will fail with a 403 error.

### Custom domain (optional)

1. Register the domain at Cloudflare Registrar or Porkbun.
2. At the registrar DNS panel, add:
   - `A` records (apex): `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `CNAME` for `www`: `username.github.io`
3. Add a `CNAME` file to the repo root containing only the domain, e.g. `saszyklab.neiu.edu`.
4. Settings → Pages → Custom domain → enter the domain → Save.
5. Wait for DNS propagation (~5–30 min) and HTTPS provisioning, then enable
   **"Enforce HTTPS"**.
6. Update `robots.txt` and `sitemap.xml` with the confirmed domain.

---

## Cost summary

| Item | Cost |
|---|---|
| Domain registration (first year) | ~$8–12 |
| Domain renewal | ~$10–15/yr |
| GitHub Pages hosting | $0 |
| GitHub Actions (public repo) | $0 |
| OpenAlex API | $0 |
| Google Fonts + Phosphor Icons CDN | $0 |
| **Total recurring** | **~$10–15/yr** |

---

## Future upgrade paths

- **Astro migration** — Justified if the site grows to 10+ pages or gains a markdown
  blog. The current design tokens and component structure map cleanly to Astro's
  component model.
- **LLM semantic filter** — The `config.json` `description` field is reserved for a
  future semantic filter step in the Actions job that uses an LLM embedding or
  zero-shot classifier to remove off-topic results before writing `citations.json`.
  Cost would be ~$0.01–0.10/month.
- **Privacy-respecting analytics** — GoatCounter (free self-hosted) or Plausible
  (~$9/mo) can be added with a single `<script>` tag. Neither requires cookies.
- **Cloudflare in front of GitHub Pages** — Free tier; adds edge caching, bot
  filtering, and Web Analytics.
- **Formspree / Getform** — Replace the `mailto:` contact link with a form endpoint
  (free tier: 100 submissions/month) to avoid exposing the email address to scrapers.

---

## Handoff notes — placeholder checklist

Before launch, resolve every instance of the markers below with confirmed information
from the professor. Use `grep -r "developer to replace\|<!-- verify\|<!-- Placeholder\|<!-- TK"` in the repo root to find them all quickly.

| Marker | Location | What to confirm |
|---|---|---|
| `<!-- TK: undergraduate institution -->` | `index.html` About section | B.A. institution name |
| `<!-- developer to replace -->` (Google Scholar) | `index.html` About sidebar + Footer | Actual Scholar user ID (e.g., `citations?user=ABC123XYZ`) |
| `<!-- developer to replace -->` (ORCID) | `index.html` About sidebar + Footer | Confirmed ORCID identifier |
| `<!-- developer to replace -->` (canonical URL) | `index.html` `<head>` | Confirmed domain |
| `<!-- developer to replace -->` (OG URL) | `index.html` `<head>` | Confirmed domain |
| `<!-- developer to replace -->` (office phone) | `index.html` Contact section | Confirmed phone number |
| `<!-- developer to replace -->` (booking URL) | `index.html` Contact section | Confirmed calendar/booking link |
| `<!-- Placeholder hours -->` | `index.html` Teaching section | Confirmed semester office hours |
| `<!-- Placeholder lab roster -->` | `index.html` Research section | Confirmed lab member names and roles |
| `<!-- verify DOI -->` (×4) | `index.html` Selected Publications | Verify DOIs with professor or CrossRef |
| `sitemap.xml` domain | `sitemap.xml` | Update `<loc>` with confirmed domain |
| `robots.txt` domain | `robots.txt` | Update `Sitemap:` line with confirmed domain |
| `assets/images/professor.jpg` | placeholder path | Replace with actual portrait (~2000×2500px) |
| `assets/images/og-image.jpg` | placeholder path | Replace with OG card (1200×630px) |
| `assets/pdfs/cv.pdf` | placeholder path | Replace with actual CV PDF |
| `assets/pdfs/syllabi/*.pdf` | placeholder paths | Replace with current syllabi |
| `assets/icons/favicon.svg` | placeholder path | Replace with actual favicon |
| `data/config.json` ORCID | `"orcid": "0000-0000-0000-0000"` | Update with confirmed ORCID |

---

## Deployment instructions

### Step-by-step runbook for the developer

**1. Create the GitHub repository.**
Log in to GitHub and create a new repository. For free unlimited Actions minutes, make
it public. If you name it `username.github.io`, the site deploys at the root path
(`https://username.github.io/`). If you name it anything else (e.g., `saszik-lab-site`),
it deploys at a subpath (`https://username.github.io/saszik-lab-site/`). All asset
paths in this codebase are relative, so subpath deployment requires no code changes.

**2. Push the generated code.**
```bash
git init
git remote add origin https://github.com/your-username/saszik-lab-site.git
git add .
git commit -m "feat: initial site build"
git branch -M main
git push -u origin main
```

**3. Enable GitHub Pages.**
Settings → Pages → Source → **Deploy from a branch** → Branch: `main`, Folder: `/ (root)` → Save.
Wait 1–2 minutes, then confirm the site loads at the GitHub-assigned URL.

**4. Grant Actions write permissions.**
Settings → Actions → General → Workflow permissions → select **"Read and write
permissions"** → Save. Without this, the monthly citation commit will fail with 403.

**5. Manually seed real citations data.**
Go to Actions tab → "Monthly citation fetch" → **Run workflow** → Run. Wait ~30
seconds, then verify a commit appears on `main` updating `data/citations.json` and
that the Publications section on the live site renders the new entries.

**6. Replace placeholder assets.**
Swap in the real files at their expected paths (see Handoff notes table). Commit and
push each asset swap. The portrait target is `assets/images/professor.jpg` (~2000×2500px
sRGB JPG); OG card is `assets/images/og-image.jpg` (1200×630px); CV is
`assets/pdfs/cv.pdf`.

**7. Walk the Handoff notes checklist.**
Use `grep -r "developer to replace\|<!-- verify\|<!-- Placeholder\|<!-- TK"` to find
every placeholder in the codebase. Resolve each one with confirmed information from
the professor before marking the site as launch-ready.

**8. (Optional) Configure a custom domain.**
Register the domain → add apex A records (`185.199.108.153`, `185.199.109.153`,
`185.199.110.153`, `185.199.111.153`) and a `www` CNAME pointing to `username.github.io`
→ add a `CNAME` file to the repo root → enter the domain in Pages settings → wait for
HTTPS provisioning → enable **"Enforce HTTPS"**. Update the `<loc>` in `sitemap.xml`
and the `Sitemap:` line in `robots.txt` to the confirmed domain.

**9. Lighthouse audit.**
Run Chrome DevTools Lighthouse (or `npx lighthouse <url>`) in mobile + desktop modes.
Resolve any Accessibility warnings (contrast ratios, heading order, missing labels),
Performance issues (uncompressed images, render-blocking resources), and SEO notes
(missing meta, uncrawlable links).

**10. Submit sitemap to Google Search Console.**
Register the property at [search.google.com/search-console](https://search.google.com/search-console).
Verify ownership via a DNS TXT record or HTML file tag. Submit
`https://yourdomain.com/sitemap.xml` under Sitemaps. This step is optional but
accelerates indexing.
