/* ==========================================================================
   highlights.js — the Instagram highlights slideshow
   --------------------------------------------------------------------------
   Why this is local images and not an API call:

   Instagram Story Highlights are not exposed by ANY Instagram API. Not the
   Graph API, not the (now retired) Basic Display API, and not by the paid
   third-party widgets either — they can only reach regular feed posts. So a
   highlights carousel has to be images saved out of Instagram and dropped
   into /assets/img/highlights/, listed in /content/highlights.json.

   That trade turns out well: no token to expire, no rate limit, no consent
   banner, and the images are served from our own origin at our own sizes.

   Accessibility: it is a labelled carousel with real buttons, arrow-key
   support, swipe, and a live region announcing slide changes. Autoplay stops
   on hover, on focus, when the tab is hidden, when the section scrolls out
   of view, and permanently once the visitor takes manual control. Under
   prefers-reduced-motion it never autoplays and never cross-fades.
   ========================================================================== */

(function () {
  'use strict';

  var root = document.getElementById('highlights');
  if (!root) return;

  var viewport = root.querySelector('[data-hl-viewport]');
  var dotsWrap = root.querySelector('[data-hl-dots]');
  var prevBtn  = root.querySelector('[data-hl-prev]');
  var nextBtn  = root.querySelector('[data-hl-next]');
  var liveEl   = root.querySelector('[data-hl-live]');
  var status   = root.querySelector('[data-hl-status]');
  if (!viewport) return;

  var SOURCE = root.dataset.source || '/content/highlights.json';
  var IMG_BASE = root.dataset.imageBase || '/assets/img/highlights/';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  var slides = [];        // DOM nodes
  var data = [];          // slide records
  var index = 0;
  var timer = null;
  var userTook = false;   // manual interaction disables autoplay for good
  var visible = true;
  var interval = 6000;
  var loop = true;

  /* -- Build --------------------------------------------------------------- */

  function buildSlide(rec, i) {
    var fig = document.createElement('figure');
    fig.className = 'hl__slide';
    fig.setAttribute('role', 'group');
    fig.setAttribute('aria-roledescription', 'slide');
    fig.setAttribute('aria-label', (i + 1) + ' of ' + data.length);
    if (i !== 0) fig.setAttribute('aria-hidden', 'true');

    var pic = document.createElement('picture');
    var base = IMG_BASE + rec.file;

    ['avif', 'webp'].forEach(function (fmt) {
      var s = document.createElement('source');
      s.srcset = base + '.' + fmt;
      s.type = 'image/' + fmt;
      pic.appendChild(s);
    });

    var img = document.createElement('img');
    img.src = base + '.jpg';
    img.alt = rec.alt || '';
    img.decoding = 'async';
    /* The first slide is what people see when the section scrolls in, so it
       loads eagerly; the rest wait. */
    img.loading = i === 0 ? 'eager' : 'lazy';
    img.draggable = false;
    pic.appendChild(img);

    /* A slide whose image 404s would otherwise be a silent blank panel. */
    img.addEventListener('error', function () {
      fig.classList.add('hl__slide--missing');
      var warn = document.createElement('p');
      warn.className = 'hl__missing';
      warn.textContent = 'Image not found: ' + rec.file;
      fig.appendChild(warn);
    });

    fig.appendChild(pic);

    if (rec.caption) {
      var cap = document.createElement('figcaption');
      cap.className = 'hl__caption';
      cap.textContent = rec.caption;
      fig.appendChild(cap);
    }

    /* An optional link wraps the whole slide. */
    var href = typeof rec.href === 'string' && /^https?:\/\//i.test(rec.href.trim())
      ? rec.href.trim() : null;
    if (href) {
      var a = document.createElement('a');
      a.className = 'hl__link';
      a.href = href;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.setAttribute('aria-label', (rec.caption || rec.alt || 'Highlight') +
        ' — opens Instagram in a new tab');
      fig.appendChild(a);
    }

    return fig;
  }

  function buildDots() {
    if (!dotsWrap) return;
    dotsWrap.textContent = '';
    data.forEach(function (rec, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'hl__dot';
      b.setAttribute('aria-label', 'Go to slide ' + (i + 1));
      b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
      b.addEventListener('click', function () {
        takeControl();
        go(i);
      });
      dotsWrap.appendChild(b);
    });
  }

  /* -- Movement ------------------------------------------------------------ */

  function go(next) {
    if (!slides.length) return;

    if (next < 0) next = loop ? slides.length - 1 : 0;
    if (next >= slides.length) next = loop ? 0 : slides.length - 1;
    if (next === index) return;

    slides[index].classList.remove('is-current');
    slides[index].setAttribute('aria-hidden', 'true');

    index = next;

    slides[index].classList.add('is-current');
    slides[index].removeAttribute('aria-hidden');

    if (dotsWrap) {
      Array.prototype.forEach.call(dotsWrap.children, function (d, i) {
        d.setAttribute('aria-pressed', i === index ? 'true' : 'false');
      });
    }

    if (status) status.textContent = (index + 1) + ' / ' + slides.length;

    /* Only announce once the visitor is driving; an autoplaying carousel
       narrating itself every six seconds is hostile to screen readers. */
    if (liveEl && userTook) {
      liveEl.textContent = 'Slide ' + (index + 1) + ' of ' + slides.length +
        (data[index] && data[index].caption ? ': ' + data[index].caption : '');
    }

    if (!loop) {
      if (prevBtn) prevBtn.disabled = index === 0;
      if (nextBtn) nextBtn.disabled = index === slides.length - 1;
    }
  }

  function next() { go(index + 1); }
  function prev() { go(index - 1); }

  /* -- Autoplay ------------------------------------------------------------ */

  function play() {
    if (timer || userTook || reduce.matches || !visible) return;
    if (slides.length < 2) return;
    timer = setInterval(next, interval);
  }

  function pause() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  /* Any deliberate interaction ends autoplay permanently. Someone who has
     started browsing the slides does not want the thing moving under them. */
  function takeControl() {
    userTook = true;
    pause();
    root.classList.add('hl--manual');
  }

  /* -- Wiring -------------------------------------------------------------- */

  function wire() {
    if (prevBtn) prevBtn.addEventListener('click', function () {
      takeControl(); prev();
    });
    if (nextBtn) nextBtn.addEventListener('click', function () {
      takeControl(); next();
    });

    root.addEventListener('mouseenter', pause);
    root.addEventListener('mouseleave', play);
    root.addEventListener('focusin', pause);
    root.addEventListener('focusout', function (e) {
      if (!root.contains(e.relatedTarget)) play();
    });

    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); takeControl(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); takeControl(); prev(); }
    });

    /* Swipe. Pointer events cover touch and mouse drag in one path. */
    var startX = null, startY = null;
    viewport.addEventListener('pointerdown', function (e) {
      startX = e.clientX; startY = e.clientY;
    }, { passive: true });

    viewport.addEventListener('pointerup', function (e) {
      if (startX === null) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      startX = startY = null;
      /* Ignore mostly-vertical drags — that is the page scrolling. */
      if (Math.abs(dx) < 44 || Math.abs(dx) < Math.abs(dy)) return;
      takeControl();
      if (dx < 0) next(); else prev();
    }, { passive: true });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) pause(); else play();
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          visible = en.isIntersecting;
          if (visible) play(); else pause();
        });
      }, { threshold: 0.2 }).observe(root);
    }

    if (reduce.addEventListener) {
      reduce.addEventListener('change', function () {
        if (reduce.matches) pause(); else play();
      });
    }
  }

  /* -- Load ---------------------------------------------------------------- */

  fetch(SOURCE, { cache: 'no-cache' })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (json) {
      data = (json && json.slides || []).filter(function (s) {
        return s && typeof s.file === 'string';
      });

      var settings = (json && json.settings) || {};
      if (typeof settings.autoplaySeconds === 'number') {
        interval = Math.max(2, settings.autoplaySeconds) * 1000;
      }
      if (settings.loop === false) loop = false;

      if (!data.length) {
        root.classList.add('hl--empty');
        viewport.innerHTML =
          '<p class="hl__empty">No highlights yet. Add images to ' +
          '<code>/assets/img/highlights/</code> and list them in ' +
          '<code>/content/highlights.json</code>.</p>';
        return;
      }

      viewport.textContent = '';
      var frag = document.createDocumentFragment();
      data.forEach(function (rec, i) {
        var el = buildSlide(rec, i);
        slides.push(el);
        frag.appendChild(el);
      });
      viewport.appendChild(frag);

      slides[0].classList.add('is-current');
      buildDots();
      if (status) status.textContent = '1 / ' + slides.length;

      root.classList.add('is-ready');
      wire();
      play();
    })
    .catch(function (err) {
      root.classList.add('hl--empty');
      viewport.innerHTML =
        '<p class="hl__empty">Highlights are unavailable right now.</p>';
      if (window.console) console.warn('[highlights]', err);
    });
})();
