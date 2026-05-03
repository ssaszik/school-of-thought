/**
 * main.js — Saszik Lab site
 * Handles: sticky nav shadow, smooth scroll, mobile menu (focus trap + Esc),
 * active nav link highlighting, scroll-reveal animations, copy-email button,
 * and dynamic footer year.
 * ES module — no globals, no jQuery, no polyfills.
 */

// ─── Smooth scroll with header offset ────────────────────────────────────────

const SCROLL_OFFSET = 80; // px below sticky header

function smoothScrollTo(targetId) {
  const el = document.getElementById(targetId);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET;
  window.scrollTo({ top, behavior: 'smooth' });
}

document.addEventListener('click', (e) => {
  const anchor = e.target.closest('a[href^="#"]');
  if (!anchor) return;
  const hash = anchor.getAttribute('href');
  if (!hash || hash === '#') return;
  e.preventDefault();
  const id = hash.slice(1);
  smoothScrollTo(id);
  // Update URL without jump
  history.pushState(null, '', hash);
});


// ─── Sticky header shadow ─────────────────────────────────────────────────────

const header = document.querySelector('.site-header');

function updateHeaderScroll() {
  if (!header) return;
  if (window.scrollY > 40) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
}

window.addEventListener('scroll', updateHeaderScroll, { passive: true });
updateHeaderScroll(); // run once on load


// ─── Active nav link via IntersectionObserver ─────────────────────────────────

const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('main section[id]');

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinks.forEach((link) => {
          const href = link.getAttribute('href');
          link.classList.toggle('active', href === `#${id}`);
        });
      }
    });
  },
  {
    rootMargin: `-${SCROLL_OFFSET + 20}px 0px -60% 0px`,
    threshold: 0,
  }
);

sections.forEach((section) => sectionObserver.observe(section));


// ─── Mobile menu ──────────────────────────────────────────────────────────────

const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobile-menu');
const mobileLinks = mobileMenu ? mobileMenu.querySelectorAll('.mobile-nav-link') : [];

/** Returns all keyboard-focusable elements within a container */
function getFocusable(container) {
  return Array.from(
    container.querySelectorAll(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  );
}

function openMenu() {
  if (!hamburger || !mobileMenu) return;
  mobileMenu.classList.add('open');
  mobileMenu.setAttribute('aria-hidden', 'false');
  hamburger.setAttribute('aria-expanded', 'true');
  hamburger.setAttribute('aria-label', 'Close navigation menu');
  hamburger.querySelector('.ph').className = 'ph ph-x';
  // Move focus to first link
  const firstFocusable = getFocusable(mobileMenu)[0];
  if (firstFocusable) firstFocusable.focus();
}

function closeMenu() {
  if (!hamburger || !mobileMenu) return;
  mobileMenu.classList.remove('open');
  mobileMenu.setAttribute('aria-hidden', 'true');
  hamburger.setAttribute('aria-expanded', 'false');
  hamburger.setAttribute('aria-label', 'Open navigation menu');
  hamburger.querySelector('.ph').className = 'ph ph-list';
}

function toggleMenu() {
  const isOpen = mobileMenu && mobileMenu.classList.contains('open');
  isOpen ? closeMenu() : openMenu();
}

if (hamburger) {
  hamburger.addEventListener('click', toggleMenu);
}

// Close on Esc
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && mobileMenu && mobileMenu.classList.contains('open')) {
    closeMenu();
    if (hamburger) hamburger.focus();
  }
});

// Close when a nav link is clicked
mobileLinks.forEach((link) => {
  link.addEventListener('click', () => closeMenu());
});

// Focus trap inside mobile menu
if (mobileMenu) {
  mobileMenu.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusable = getFocusable(mobileMenu);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
}

// Close mobile menu on resize to desktop
window.addEventListener('resize', () => {
  if (window.innerWidth >= 640 && mobileMenu && mobileMenu.classList.contains('open')) {
    closeMenu();
  }
}, { passive: true });


// ─── Scroll-reveal animations ─────────────────────────────────────────────────

const animateEls = document.querySelectorAll('[data-animate]');

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  {
    rootMargin: '0px 0px -60px 0px',
    threshold: 0.05,
  }
);

animateEls.forEach((el) => revealObserver.observe(el));


// ─── Copy email button ────────────────────────────────────────────────────────

const copyBtn = document.getElementById('copy-email-btn');
const copyConfirm = document.getElementById('copy-confirm');

if (copyBtn && copyConfirm) {
  copyBtn.addEventListener('click', async () => {
    const email = copyBtn.dataset.email;
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      copyConfirm.textContent = 'Copied!';
    } catch {
      // Fallback for browsers without clipboard API
      copyConfirm.textContent = email;
    }
    setTimeout(() => { copyConfirm.textContent = ''; }, 2500);
  });
}


// ─── Dynamic footer year ──────────────────────────────────────────────────────

const yearEl = document.getElementById('footer-year');
if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}
