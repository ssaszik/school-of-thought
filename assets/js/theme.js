/**
 * theme.js — Saszik Lab site
 * Must be loaded as <script type="module"> in <head> to prevent theme flash.
 * Reads localStorage.theme first; falls back to prefers-color-scheme.
 * Wires the #theme-toggle button to flip and persist the preference.
 */

const STORAGE_KEY = 'theme';
const DARK = 'dark';
const LIGHT = 'light';

// ─── Determine initial theme ──────────────────────────────────────────────────

function getPreferredTheme() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === DARK || stored === LIGHT) return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK : LIGHT;
}

// ─── Apply theme to <html> ────────────────────────────────────────────────────

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

// ─── Update toggle button label + icon ───────────────────────────────────────

function syncToggleButton(theme) {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const icon = btn.querySelector('.ph');
  if (theme === DARK) {
    btn.setAttribute('aria-label', 'Switch to light mode');
    if (icon) icon.className = 'ph ph-moon';
  } else {
    btn.setAttribute('aria-label', 'Switch to dark mode');
    if (icon) icon.className = 'ph ph-sun';
  }
}

// ─── Toggle handler ───────────────────────────────────────────────────────────

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || LIGHT;
  const next = current === DARK ? LIGHT : DARK;
  applyTheme(next);
  localStorage.setItem(STORAGE_KEY, next);
  syncToggleButton(next);
}

// ─── Initialise pre-paint ─────────────────────────────────────────────────────

// Apply theme immediately (this script runs in <head> before any paint)
const initial = getPreferredTheme();
applyTheme(initial);

// Wire the button once the DOM is ready (icons may not be loaded yet in <head>)
document.addEventListener('DOMContentLoaded', () => {
  syncToggleButton(initial);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.addEventListener('click', toggleTheme);
});

// ─── System preference listener ───────────────────────────────────────────────
// Update if user changes their OS preference AND hasn't set a manual override.
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (!localStorage.getItem(STORAGE_KEY)) {
    const theme = e.matches ? DARK : LIGHT;
    applyTheme(theme);
    syncToggleButton(theme);
  }
});
