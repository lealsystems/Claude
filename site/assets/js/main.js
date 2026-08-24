/* ==========================================================================
   main.js — header, theme, mobile nav, scroll reveals, marquee, form
   ========================================================================== */

(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------------
     Theme
     The inline script in <head> has already applied the stored choice to
     avoid a flash; this only handles the toggle from here on.
     ---------------------------------------------------------------------- */

  var root = document.documentElement;
  var toggle = document.querySelector('[data-theme-toggle]');

  function currentTheme() {
    var set = root.getAttribute('data-theme');
    if (set) return set;
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark' : 'light';
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('cc-theme', next); } catch (e) { /* private mode */ }
      toggle.setAttribute('aria-label',
        next === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
      /* islands.js listens for this to re-read its palette. */
      window.dispatchEvent(new CustomEvent('themechange', { detail: next }));
    });
  }

  /* ------------------------------------------------------------------------
     Sticky header
     ---------------------------------------------------------------------- */

  var header = document.querySelector('.site-header');
  if (header) {
    var onScrollHeader = function () {
      header.classList.toggle('is-stuck', window.scrollY > 24);
    };
    window.addEventListener('scroll', onScrollHeader, { passive: true });
    onScrollHeader();
  }

  /* ------------------------------------------------------------------------
     Mobile nav
     ---------------------------------------------------------------------- */

  var navToggle = document.querySelector('[data-nav-toggle]');
  var nav = document.getElementById('primary-nav');
  var scrim = document.querySelector('[data-nav-scrim]');

  function setNav(open) {
    if (!nav || !navToggle) return;
    nav.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    if (scrim) scrim.classList.toggle('is-on', open);
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) {
      var first = nav.querySelector('a, button');
      if (first) first.focus();
    }
  }

  if (navToggle) {
    navToggle.addEventListener('click', function () {
      setNav(navToggle.getAttribute('aria-expanded') !== 'true');
    });
  }
  if (scrim) scrim.addEventListener('click', function () { setNav(false); });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setNav(false);
  });

  if (nav) {
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setNav(false);
    });
  }

  /* Reset the mobile-nav state if the viewport grows past the breakpoint
     while the drawer is open — otherwise body scroll stays locked. */
  var wide = window.matchMedia('(min-width: 901px)');
  var onWide = function () { if (wide.matches) setNav(false); };
  if (wide.addEventListener) wide.addEventListener('change', onWide);
  else if (wide.addListener) wide.addListener(onWide);

  /* ------------------------------------------------------------------------
     Scroll reveals
     ---------------------------------------------------------------------- */

  var revealables = document.querySelectorAll('[data-reveal]');

  if (!('IntersectionObserver' in window) || reduce) {
    Array.prototype.forEach.call(revealables, function (el) {
      el.classList.add('is-in');
    });
  } else {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        /* Reveal on entry, and also whenever the element has already passed
           above the viewport. A fast flick, an anchor jump or a restored
           scroll position can move an element from below the fold to above it
           between two frames; the observer then reports a single non-
           intersecting entry, and an isIntersecting-only check would leave
           that content invisible for good. */
        if (!en.isIntersecting && en.boundingClientRect.top > 0) return;
        en.target.classList.add('is-in');
        ro.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    Array.prototype.forEach.call(revealables, function (el) {
      /* Stagger siblings inside a shared group so grids cascade. */
      var group = el.closest('[data-reveal-group]');
      if (group) {
        var kids = group.querySelectorAll('[data-reveal]');
        var idx = Array.prototype.indexOf.call(kids, el);
        el.style.setProperty('--reveal-delay', (idx * 85) + 'ms');
      }
      ro.observe(el);
    });

    /* Safety sweep. Anything still hidden once scrolling settles, but whose
       box is at or above the fold, gets shown — so no combination of missed
       callbacks can strand content off-screen. */
    var sweepTimer;
    var sweep = function () {
      var vh = window.innerHeight;
      Array.prototype.forEach.call(revealables, function (el) {
        if (el.classList.contains('is-in')) return;
        if (el.getBoundingClientRect().top < vh) {
          el.classList.add('is-in');
          ro.unobserve(el);
        }
      });
    };
    window.addEventListener('scroll', function () {
      clearTimeout(sweepTimer);
      sweepTimer = setTimeout(sweep, 220);
    }, { passive: true });
    window.addEventListener('load', sweep);
  }

  /* ------------------------------------------------------------------------
     Scroll-spy on the nav
     ---------------------------------------------------------------------- */

  var sections = document.querySelectorAll('section[id]');
  var navLinks = document.querySelectorAll('.nav__link[href^="#"]');

  if (sections.length && navLinks.length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = en.target.id;
        Array.prototype.forEach.call(navLinks, function (a) {
          a.setAttribute('aria-current',
            a.getAttribute('href') === '#' + id ? 'true' : 'false');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    Array.prototype.forEach.call(sections, function (s) { spy.observe(s); });
  }

  /* ------------------------------------------------------------------------
     Marquee
     Duplicate the track content once so the -50% translate loops seamlessly.
     ---------------------------------------------------------------------- */

  var track = document.querySelector('.marquee__track');
  if (track && !reduce) {
    track.innerHTML += track.innerHTML;
    track.setAttribute('aria-hidden', 'false');
  }

  /* ------------------------------------------------------------------------
     Contact form
     Client-side validation, then a fetch POST. The action attribute decides
     where it goes (Netlify Forms, Formspree, or your own endpoint) — see
     README. With JS off, the form still submits natively.
     ---------------------------------------------------------------------- */

  var form = document.querySelector('[data-contact-form]');

  if (form) {
    var status = form.querySelector('.form__status');

    var setError = function (field, msg) {
      var wrap = field.closest('.field');
      if (!wrap) return;
      var slot = wrap.querySelector('.field__error');
      wrap.classList.toggle('field--error', Boolean(msg));
      field.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (slot) slot.textContent = msg || '';
    };

    var validate = function () {
      var ok = true;
      var required = form.querySelectorAll('[required]');

      Array.prototype.forEach.call(required, function (f) {
        var v = (f.value || '').trim();
        if (!v) {
          setError(f, 'This field is required.');
          ok = false;
        } else if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
          setError(f, 'Enter a valid email address.');
          ok = false;
        } else if (f.type === 'tel' && v.replace(/\D/g, '').length < 10) {
          setError(f, 'Enter a 10-digit phone number.');
          ok = false;
        } else {
          setError(f, '');
        }
      });
      return ok;
    };

    form.addEventListener('input', function (e) {
      var f = e.target;
      if (f.closest('.field--error')) setError(f, '');
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      /* Honeypot: bots fill hidden fields, people don't. Pretend success. */
      var trap = form.querySelector('[name="_gotcha"]');
      if (trap && trap.value) return;

      if (!validate()) {
        var bad = form.querySelector('.field--error input, .field--error textarea');
        if (bad) bad.focus();
        return;
      }

      var btn = form.querySelector('[type="submit"]');
      var label = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
      if (status) { status.className = 'form__status'; status.textContent = ''; }

      fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          form.reset();
          if (status) {
            status.className = 'form__status is-ok';
            status.textContent =
              'Thanks — your request is in. We answer every estimate request ' +
              'within one business day.';
          }
        })
        .catch(function () {
          if (status) {
            status.className = 'form__status is-bad';
            status.textContent =
              'Something went wrong sending that. Please call us instead, ' +
              'or email us directly and we will pick it up right away.';
          }
        })
        .then(function () {
          if (btn) { btn.disabled = false; btn.textContent = label; }
        });
    });
  }

  /* ------------------------------------------------------------------------
     Current year in the footer
     ---------------------------------------------------------------------- */

  var yr = document.querySelector('[data-year]');
  if (yr) yr.textContent = String(new Date().getFullYear());
})();
