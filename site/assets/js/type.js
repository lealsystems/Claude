/* ==========================================================================
   type.js — variable-font animation
   --------------------------------------------------------------------------
   Fraunces ships four axes: opsz (9-144), wght (100-900), SOFT (0-100) and
   WONK (0-1). Rather than fading text in and calling it "animated
   typography", this interpolates the axes themselves, so the letterforms
   physically change shape as they arrive: they start small-optical-size,
   light, maximally soft and wonky (rounded terminals, the swashed `g`), and
   settle into large-optical-size, bold, crisp.

   Three behaviours:
     [data-type-reveal]  per-character arrival, staggered, on view
     [data-type-settle]  whole-heading axis settle, on view
     [data-type-breathe] slow continuous SOFT oscillation (the wordmark)

   Everything degrades safely: if variable fonts or IntersectionObserver are
   missing, or the visitor prefers reduced motion, the text is simply there.
   ========================================================================== */

(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var supportsVar =
    'CSS' in window &&
    typeof CSS.supports === 'function' &&
    CSS.supports('font-variation-settings', "'wght' 500");

  /* -- Splitting ----------------------------------------------------------- */

  /* Wrap each character in a span while keeping words unbreakable, so a
     reveal never leaves a single letter orphaned on its own line.
     Only text nodes are split; inline markup inside the heading survives. */
  function splitChars(el) {
    var words = [];
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    var n;
    while ((n = walker.nextNode())) nodes.push(n);

    nodes.forEach(function (node) {
      var text = node.nodeValue;
      if (!text.trim()) return;

      var frag = document.createDocumentFragment();
      var parts = text.split(/(\s+)/);

      parts.forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          frag.appendChild(document.createTextNode(' '));
          return;
        }
        var word = document.createElement('span');
        word.className = 'tw';
        for (var i = 0; i < part.length; i++) {
          var ch = document.createElement('span');
          ch.className = 'tc';
          ch.textContent = part[i];
          word.appendChild(ch);
          words.push(ch);
        }
        frag.appendChild(word);
      });

      node.parentNode.replaceChild(frag, node);
    });

    return words;
  }

  /* -- Easing -------------------------------------------------------------- */

  function easeOutExpo(x) {
    return x >= 1 ? 1 : 1 - Math.pow(2, -9 * x);
  }

  function lerp(a, b, p) { return a + (b - a) * p; }

  /* -- Per-character reveal ------------------------------------------------ */

  /* from -> to across the four axes, plus a small vertical rise and blur.
     The axis travel is the point; the transform just gives it somewhere to
     arrive from. */
  var FROM = { opsz: 9,   wght: 200, soft: 100, wonk: 1 };
  var TO   = { opsz: 144, wght: 640, soft: 0,   wonk: 1 };

  function animateChar(el, delay, duration) {
    var start = null;

    function tick(now) {
      if (start === null) start = now;
      var elapsed = now - start - delay;

      if (elapsed < 0) { requestAnimationFrame(tick); return; }

      var p = Math.min(1, elapsed / duration);
      var e = easeOutExpo(p);

      el.style.fontVariationSettings =
        "'opsz' " + lerp(FROM.opsz, TO.opsz, e).toFixed(1) +
        ", 'wght' " + Math.round(lerp(FROM.wght, TO.wght, e)) +
        ", 'SOFT' " + lerp(FROM.soft, TO.soft, e).toFixed(1) +
        ", 'WONK' " + lerp(FROM.wonk, TO.wonk, e).toFixed(2);

      el.style.opacity = Math.min(1, e * 1.5).toFixed(3);
      el.style.transform =
        'translate3d(0,' + (1 - e) * 0.42 + 'em,0) ' +
        'scale(' + lerp(0.94, 1, e).toFixed(4) + ')';
      el.style.filter = p < 0.85
        ? 'blur(' + ((1 - e) * 7).toFixed(2) + 'px)'
        : 'none';

      if (p < 1) {
        requestAnimationFrame(tick);
      } else {
        /* Hand the final state back to CSS and stop owning the element. */
        el.style.filter = '';
        el.style.transform = '';
        el.style.opacity = '';
        el.style.fontVariationSettings = '';
        el.classList.add('is-set');
      }
    }

    requestAnimationFrame(tick);
  }

  function runReveal(el) {
    var chars = el.__chars;
    if (!chars || !chars.length) return;

    var stagger = parseFloat(el.dataset.typeStagger) || 34;
    var duration = parseFloat(el.dataset.typeDuration) || 1150;
    var lead = parseFloat(el.dataset.typeDelay) || 0;

    chars.forEach(function (ch, i) {
      animateChar(ch, lead + i * stagger, duration);
    });

    el.classList.add('is-revealed');
  }

  /* -- Whole-heading settle ------------------------------------------------ */

  /* Cheaper than per-character: one element, one interpolation. Used for
     section titles, where a per-letter cascade on every scroll would be
     noise rather than craft. */
  function runSettle(el) {
    var duration = parseFloat(el.dataset.typeDuration) || 1100;
    var start = null;

    var from = { opsz: 14,  wght: 300, soft: 88, wonk: 1 };
    var to   = { opsz: 100, wght: 600, soft: 12, wonk: 1 };

    function tick(now) {
      if (start === null) start = now;
      var p = Math.min(1, (now - start) / duration);
      var e = easeOutExpo(p);

      el.style.fontVariationSettings =
        "'opsz' " + lerp(from.opsz, to.opsz, e).toFixed(1) +
        ", 'wght' " + Math.round(lerp(from.wght, to.wght, e)) +
        ", 'SOFT' " + lerp(from.soft, to.soft, e).toFixed(1) +
        ", 'WONK' " + to.wonk;

      el.style.opacity = Math.min(1, e * 1.8).toFixed(3);
      el.style.transform = 'translate3d(0,' + (1 - e) * 14 + 'px,0)';

      if (p < 1) requestAnimationFrame(tick);
      else {
        el.style.transform = '';
        el.style.opacity = '';
        el.style.fontVariationSettings = '';
        el.classList.add('is-set');
      }
    }
    requestAnimationFrame(tick);
  }

  /* -- Breathing wordmark -------------------------------------------------- */

  /* A very slow SOFT/wght swell, like the letterforms are on a tide. Amplitude
     is deliberately small — you should feel it, not catch it. */
  function runBreathe(el) {
    var base = parseFloat(el.dataset.breatheWght) || 600;
    var t0 = performance.now();

    function tick(now) {
      var s = (now - t0) / 1000;
      var wave = Math.sin(s * 0.34);
      el.style.fontVariationSettings =
        "'opsz' 144, 'wght' " + Math.round(base + wave * 42) +
        ", 'SOFT' " + (18 + wave * 16).toFixed(1) +
        ", 'WONK' 1";
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* -- Boot ---------------------------------------------------------------- */

  function init() {
    var reveals = Array.prototype.slice.call(
      document.querySelectorAll('[data-type-reveal]'));
    var settles = Array.prototype.slice.call(
      document.querySelectorAll('[data-type-settle]'));
    var breathers = Array.prototype.slice.call(
      document.querySelectorAll('[data-type-breathe]'));

    /* No variable-font support, or motion is unwelcome: mark everything
       finished so the CSS shows it at its final state, and leave. */
    if (!supportsVar || reduce || !('IntersectionObserver' in window)) {
      reveals.concat(settles).forEach(function (el) {
        el.classList.add('is-revealed', 'is-set');
      });
      return;
    }

    reveals.forEach(function (el) {
      el.__chars = splitChars(el);
      el.classList.add('is-split');
    });

    var fire = function (el) {
      if (el.hasAttribute('data-type-reveal')) runReveal(el);
      else runSettle(el);
    };

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        /* As in main.js: also fire for anything that has already scrolled
           past the top, so a heading skipped between frames still animates
           in rather than staying at opacity 0 forever. */
        if (!en.isIntersecting && en.boundingClientRect.top > 0) return;
        io.unobserve(en.target);
        fire(en.target);
      });
    }, { threshold: 0.25, rootMargin: '0px 0px -8% 0px' });

    var watched = reveals.concat(settles);
    watched.forEach(function (el) { io.observe(el); });
    breathers.forEach(runBreathe);

    /* Safety sweep, matching the one in main.js. */
    var sweepTimer;
    var sweep = function () {
      var vh = window.innerHeight;
      watched.forEach(function (el) {
        if (el.classList.contains('is-set') ||
            el.classList.contains('is-revealed')) return;
        if (el.getBoundingClientRect().top < vh) {
          io.unobserve(el);
          fire(el);
        }
      });
    };
    window.addEventListener('scroll', function () {
      clearTimeout(sweepTimer);
      sweepTimer = setTimeout(sweep, 220);
    }, { passive: true });
    window.addEventListener('load', sweep);
  }

  /* Wait for the real font before splitting — measuring and animating
     against a fallback face causes a visible reflow the moment Fraunces
     lands. 1.2s cap so a slow network never blocks the reveal. */
  function boot() {
    if (!document.fonts || !document.fonts.ready) { init(); return; }
    var done = false;
    var go = function () { if (!done) { done = true; init(); } };
    document.fonts.ready.then(go);
    setTimeout(go, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
