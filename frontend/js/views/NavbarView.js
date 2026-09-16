/* ═══════════════════════════════════════════════════════════════
   HABITFLOW — NavbarView  (Phase 3)
   Navigation · theme toggle · mobile menu · scroll shadow
═══════════════════════════════════════════════════════════════ */
'use strict';

const NavbarView = (() => {

  // Grab refs after DOM ready (called from app.js init)
  let _html, _navbar, _navLinks, _navOverlay, _hamburger, _themeToggle,
      _allNavLinks, _allSections;

  function _initRefs() {
    _html        = document.documentElement;
    _navbar      = document.getElementById('navbar');
    _navLinks    = document.getElementById('navLinks');
    _navOverlay  = document.getElementById('navOverlay');
    _hamburger   = document.getElementById('hamburger');
    _themeToggle = document.getElementById('themeToggle');
    _allNavLinks = document.querySelectorAll('.nav-link');
    _allSections = document.querySelectorAll('.section');
  }

  /* ── Show section ── */
  function showSection(sectionId) {
    _allSections.forEach(s => s.classList.remove('active'));
    _allNavLinks.forEach(l => l.classList.remove('active'));
    document.getElementById(sectionId)?.classList.add('active');
    _allNavLinks.forEach(l => {
      if (l.dataset.section === sectionId) l.classList.add('active');
    });
  }

  /* ── Apply theme ── */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const toggle = document.getElementById('darkModeToggle');
    if (toggle) toggle.checked = (theme === 'dark');
  }

  /* ── Mobile menu ── */
  function toggleMobileMenu(open) {
    _navLinks.classList.toggle('open', open);
    _navOverlay.classList.toggle('show', open);
    _hamburger.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  }

  /* ── Init ── */
  function init(onNavigate, onThemeToggle) {
    _initRefs();

    _allNavLinks.forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        toggleMobileMenu(false);
        onNavigate(link.dataset.section);
      });
    });

    document.querySelectorAll('[data-nav]').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        onNavigate(link.dataset.nav);
      });
    });

    _hamburger.addEventListener('click', () =>
      toggleMobileMenu(!_navLinks.classList.contains('open')));

    _navOverlay.addEventListener('click', () => toggleMobileMenu(false));
    _themeToggle.addEventListener('click', onThemeToggle);

    window.addEventListener('scroll', () => {
      _navbar.classList.toggle('scrolled', window.scrollY > 10);
    }, { passive: true });
  }

  return { init, showSection, applyTheme, toggleMobileMenu };
})();
