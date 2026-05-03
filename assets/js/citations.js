/**
 * citations.js — Saszik Lab site
 * Handles the tabbed Related Literature section with two panels:
 * - Tab 1: Academic Literature (OpenAlex citations from citations.json)
 * - Tab 2: In the News (RSS aggregation from laymans-articles.json)
 *
 * Supports English-only toggle for academic tab.
 */

const ACADEMIC_LIST_ID = 'citations-list-academic';
const NEWS_LIST_ID = 'citations-list-news';
const FOOTER_UPDATED_ID = 'footer-updated';
const MAX_AUTHORS_SHOWN = 6;
const VENUE_ABBR_MAX = 22;
const SKELETON_COUNT = 5;
const MAX_RESULTS = 15;

let academicResults = [];
let newsResults = [];
let toggleEl = null;
let activeTab = 'academic'; // 'academic' or 'news'

// ─── Entry point ──────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  toggleEl = document.getElementById('lang-en-toggle');
  initTabs();
  loadAcademicCitations();
  loadNewsArticles();

  if (toggleEl) {
    toggleEl.addEventListener('change', () => {
      // Re-render the active tab when language filter changes
      if (activeTab === 'academic') {
        const listEl = document.getElementById(ACADEMIC_LIST_ID);
        if (listEl) renderAcademicCitations(listEl);
      } else {
        const listEl = document.getElementById(NEWS_LIST_ID);
        if (listEl) renderNewsArticles(listEl);
      }
    });
  }
});

// ─── Tab System ───────────────────────────────────────────────────────────────

function initTabs() {
  const tabBtns = document.querySelectorAll('.lit-tab-btn');
  const panels = document.querySelectorAll('.lit-tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      if (tabId === activeTab) return;

      // Update button states
      tabBtns.forEach(b => {
        b.classList.toggle('active', b.dataset.tab === tabId);
        b.setAttribute('aria-selected', b.dataset.tab === tabId ? 'true' : 'false');
      });

      // Update panel visibility with crossfade
      panels.forEach(p => {
        const isTarget = p.id === `panel-${tabId}`;
        if (isTarget) {
          p.classList.add('active');
          p.setAttribute('aria-hidden', 'false');
        } else {
          p.classList.remove('active');
          p.setAttribute('aria-hidden', 'true');
        }
      });

      activeTab = tabId;
      // English toggle is now always visible for both tabs
    });
  });
}

// ─── Academic Literature (OpenAlex) ───────────────────────────────────────────

async function loadAcademicCitations() {
  const listEl = document.getElementById(ACADEMIC_LIST_ID);
  if (!listEl) return;

  renderSkeleton(listEl);

  try {
    const res = await fetch('./data/citations.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    academicResults = Array.isArray(data.results) ? data.results.slice(0, MAX_RESULTS) : [];

    if (data.generated_at) {
      const badgeDateEl = document.getElementById('citations-badge-date');
      if (badgeDateEl) badgeDateEl.textContent = formatDate(data.generated_at);
      renderFooterUpdated(data.generated_at);
    }

    renderAcademicCitations(listEl);
  } catch (err) {
    console.error('[citations.js] Failed to load citations.json:', err);
    renderError(listEl, 'academic');
  }
}

function getFilteredAcademicResults() {
  const englishOnly = toggleEl ? toggleEl.checked : true;
  if (!englishOnly) return academicResults;
  return academicResults.filter(item => item.language === 'en');
}

function renderAcademicCitations(listEl) {
  const results = getFilteredAcademicResults().slice(0, MAX_RESULTS);
  listEl.innerHTML = '';

  if (results.length === 0) {
    renderEmpty(listEl, 'academic');
    return;
  }

  results.forEach((item, i) => {
    const el = createAcademicCitationElement(item);
    el.style.animationDelay = `${i * 55}ms`;
    listEl.appendChild(el);
  });
}

function createAcademicCitationElement(item) {
  const article = document.createElement('article');
  article.className = 'citation-item';

  // ── Year column (left) ──────────────────────────────────────────────────────
  const yearEl = document.createElement('div');
  yearEl.className = 'citation-year';
  yearEl.textContent = item.year || '—';
  if (item.venue) {
    const small = document.createElement('small');
    small.textContent = item.venue.length > VENUE_ABBR_MAX
      ? item.venue.substring(0, VENUE_ABBR_MAX) + '…'
      : item.venue;
    yearEl.appendChild(small);
  }
  article.appendChild(yearEl);

  // ── Body column (center) ────────────────────────────────────────────────────
  const bodyEl = document.createElement('div');
  bodyEl.className = 'citation-body';

  // Title
  const titleH4 = document.createElement('h4');
  if (item.url || item.doi) {
    const url = item.url || `https://doi.org/${item.doi}`;
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = item.title || 'Untitled';
    titleH4.appendChild(link);
  } else {
    titleH4.textContent = item.title || 'Untitled';
  }
  bodyEl.appendChild(titleH4);

  // Authors
  if (Array.isArray(item.authors) && item.authors.length > 0) {
    const authorEl = document.createElement('div');
    authorEl.className = 'citation-authors';
    const shown = item.authors.slice(0, MAX_AUTHORS_SHOWN);
    authorEl.textContent = shown.join(', ') + (item.authors.length > MAX_AUTHORS_SHOWN ? ', et al.' : '');
    bodyEl.appendChild(authorEl);
  }

  // Venue + DOI
  if (item.venue || item.doi) {
    const venueEl = document.createElement('div');
    venueEl.className = 'citation-venue';
    if (item.venue) {
      venueEl.textContent = item.venue;
    }
    if (item.doi) {
      const doiSpan = document.createElement('span');
      doiSpan.className = 'citation-doi-text';
      doiSpan.textContent = `DOI: ${item.doi}`;
      venueEl.appendChild(doiSpan);
    }
    bodyEl.appendChild(venueEl);
  }

  // Keyword chip
  if (item.matched_keyword) {
    const chip = document.createElement('span');
    chip.className = 'citation-keyword-chip';
    chip.textContent = item.matched_keyword;
    bodyEl.appendChild(chip);
  }

  article.appendChild(bodyEl);

  // ── Meta column (right) ─────────────────────────────────────────────────────
  const metaEl = document.createElement('div');
  metaEl.className = 'citation-meta-col';

  // Source badge
  const sourceName = item.source === 'semantic_scholar' ? 'Semantic Scholar' : 'OpenAlex';
  const sourceBadge = document.createElement('div');
  sourceBadge.className = 'citation-source-badge';
  sourceBadge.textContent = sourceName;
  metaEl.appendChild(sourceBadge);

  // DOI / external link
  if (item.doi || item.url) {
    const url = item.url || `https://doi.org/${item.doi}`;
    const doiLink = document.createElement('a');
    doiLink.className = 'citation-doi-link';
    doiLink.href = url;
    doiLink.target = '_blank';
    doiLink.rel = 'noopener noreferrer';
    doiLink.setAttribute('aria-label', `Open "${item.title || 'this paper'}" (external link)`);
    doiLink.textContent = 'DOI →';
    metaEl.appendChild(doiLink);
  }

  if (item.pubmed_url) {
    const pmLink = document.createElement('a');
    pmLink.className = 'citation-doi-link';
    pmLink.href = item.pubmed_url;
    pmLink.target = '_blank';
    pmLink.rel = 'noopener noreferrer';
    pmLink.setAttribute('aria-label', `View "${item.title || 'this paper'}" on PubMed`);
    pmLink.textContent = 'PubMed →';
    metaEl.appendChild(pmLink);
  }

  article.appendChild(metaEl);
  return article;
}

// ─── News Articles (RSS) ──────────────────────────────────────────────────────

async function loadNewsArticles() {
  const listEl = document.getElementById(NEWS_LIST_ID);
  if (!listEl) return;

  renderSkeleton(listEl);

  try {
    const res = await fetch('./data/laymans-articles.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    newsResults = Array.isArray(data.results) ? data.results.slice(0, MAX_RESULTS) : [];

    if (data.generated_at) {
      const badgeDateEl = document.getElementById('news-badge-date');
      if (badgeDateEl) badgeDateEl.textContent = formatDate(data.generated_at);
    }

    renderNewsArticles(listEl);
  } catch (err) {
    console.error('[citations.js] Failed to load laymans-articles.json:', err);
    renderError(listEl, 'news');
  }
}

function getFilteredNewsResults() {
  const englishOnly = !toggleEl || toggleEl.checked;
  if (!englishOnly) return newsResults;
  // Filter by language field; default to English if not specified (our RSS sources are English)
  return newsResults.filter(item => !item.language || item.language === 'en');
}

function renderNewsArticles(listEl) {
  const results = getFilteredNewsResults().slice(0, MAX_RESULTS);
  listEl.innerHTML = '';

  if (results.length === 0) {
    renderEmpty(listEl, 'news');
    return;
  }

  results.forEach((item, i) => {
    const el = createNewsElement(item);
    el.style.animationDelay = `${i * 55}ms`;
    listEl.appendChild(el);
  });
}

function createNewsElement(item) {
  const article = document.createElement('article');
  article.className = 'citation-item';

  // ── Date column (left) ──────────────────────────────────────────────────────
  const dateEl = document.createElement('div');
  dateEl.className = 'citation-year';
  dateEl.textContent = formatShortDate(item.date);
  if (item.source) {
    const small = document.createElement('small');
    small.textContent = item.source;
    dateEl.appendChild(small);
  }
  article.appendChild(dateEl);

  // ── Body column (center) ────────────────────────────────────────────────────
  const bodyEl = document.createElement('div');
  bodyEl.className = 'citation-body';

  // Title
  const titleH4 = document.createElement('h4');
  if (item.url) {
    const link = document.createElement('a');
    link.href = item.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = item.title || 'Untitled';
    titleH4.appendChild(link);
  } else {
    titleH4.textContent = item.title || 'Untitled';
  }
  bodyEl.appendChild(titleH4);

  // Summary
  if (item.summary) {
    const summaryEl = document.createElement('div');
    summaryEl.className = 'citation-authors'; // Reuse author styling
    summaryEl.textContent = item.summary;
    bodyEl.appendChild(summaryEl);
  }

  // Source as venue
  if (item.source) {
    const venueEl = document.createElement('div');
    venueEl.className = 'citation-venue';
    venueEl.textContent = item.source;
    bodyEl.appendChild(venueEl);
  }

  article.appendChild(bodyEl);

  // ── Meta column (right) ─────────────────────────────────────────────────────
  const metaEl = document.createElement('div');
  metaEl.className = 'citation-meta-col';

  // Source badge
  const sourceBadge = document.createElement('div');
  sourceBadge.className = 'citation-source-badge';
  sourceBadge.textContent = 'News';
  metaEl.appendChild(sourceBadge);

  // Read Article link
  if (item.url) {
    const readLink = document.createElement('a');
    readLink.className = 'citation-doi-link';
    readLink.href = item.url;
    readLink.target = '_blank';
    readLink.rel = 'noopener noreferrer';
    readLink.setAttribute('aria-label', `Read "${item.title || 'this article'}"`);
    readLink.textContent = 'Read Article →';
    metaEl.appendChild(readLink);
  }

  article.appendChild(metaEl);
  return article;
}

// ─── Shared Rendering ─────────────────────────────────────────────────────────

function renderSkeleton(listEl) {
  listEl.innerHTML = '';
  for (let i = 0; i < SKELETON_COUNT; i++) {
    const row = document.createElement('div');
    row.className = 'citation-skeleton';
    row.setAttribute('aria-hidden', 'true');
    row.innerHTML = `
      <div>
        <div class="skel skel-year"></div>
        <div class="skel skel-venue"></div>
      </div>
      <div>
        <div class="skel skel-title"></div>
        <div class="skel skel-authors"></div>
        <div class="skel skel-venue-body"></div>
      </div>
      <div><div class="skel skel-badge"></div></div>
    `;
    listEl.appendChild(row);
  }
}

function renderEmpty(listEl, type) {
  const msg = type === 'news'
    ? 'No news articles found. The list refreshes automatically on the 1st of each month.'
    : 'No recent publications found. The list refreshes automatically on the 1st of each month.';

  listEl.innerHTML = `<p class="citations-empty">${msg}</p>`;
}

function renderError(listEl, type) {
  const fallback = type === 'news'
    ? 'Check back later for science news relevant to our research.'
    : 'Please check back later or view the <a href="#publications">selected publications</a> above.';

  listEl.innerHTML = `
    <p class="citations-error">
      Could not load ${type === 'news' ? 'news articles' : 'recent publications'}. ${fallback}
    </p>`;
}

// ─── Footer "Last updated" ────────────────────────────────────────────────────

function renderFooterUpdated(generatedAt) {
  const el = document.getElementById(FOOTER_UPDATED_ID);
  if (!el || !generatedAt) return;
  el.textContent = `Publications last updated: ${formatDate(generatedAt)}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(isoString) {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    return isoString;
  }
}

function formatShortDate(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateString;
  }
}
