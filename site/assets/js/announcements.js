/* ==========================================================================
   announcements.js — renders /content/announcements.json into the board
   --------------------------------------------------------------------------
   The client edits one JSON file; nothing here needs touching. Entries are
   sorted newest-first, pinned entries float to the top, and anything past its
   `expires` date drops off on its own.

   The markup this builds is deliberately plain and high-contrast: this is the
   one section on the page people actually read word-for-word, so it gets a
   wider measure, larger body type and no animation on the text itself.
   ========================================================================== */

(function () {
  'use strict';

  var mount = document.getElementById('announcement-list');
  if (!mount) return;

  var SOURCE = mount.dataset.source || '/content/announcements.json';

  /* -- Helpers ------------------------------------------------------------- */

  /* Everything from the JSON is treated as text, never markup. The client
     writes plain prose; if they ever paste something with angle brackets in
     it, it must not become live HTML. */
  function text(tag, cls, value) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (value != null) el.textContent = String(value);
    return el;
  }

  /* Parse as a local date, not UTC. `new Date('2026-08-24')` is parsed as
     midnight UTC, which renders as the 23rd for anyone west of Greenwich —
     an announcement dated a day early is exactly the kind of small wrongness
     a client notices immediately. */
  function parseDate(iso) {
    if (typeof iso !== 'string') return null;
    var m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return isNaN(d.getTime()) ? null : d;
  }

  function formatDate(d) {
    if (!d) return '';
    try {
      return d.toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
    } catch (e) {
      return d.toDateString();
    }
  }

  /* "3 days ago" style, for the freshness cue under the date. */
  function relative(d) {
    if (!d) return '';
    var days = Math.round((Date.now() - d.getTime()) / 86400000);
    if (days < 0) return 'Scheduled';
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return days + ' days ago';
    if (days < 14) return 'Last week';
    if (days < 60) return Math.floor(days / 7) + ' weeks ago';
    if (days < 365) return Math.floor(days / 30) + ' months ago';
    return 'Over a year ago';
  }

  /* Only same-page anchors and plain http(s) links are allowed through, so a
     stray `javascript:` in the content file can never become a live link. */
  function safeHref(href) {
    if (typeof href !== 'string') return null;
    var v = href.trim();
    if (/^#[\w-]*$/.test(v)) return v;
    if (/^https?:\/\//i.test(v)) return v;
    if (/^mailto:/i.test(v) || /^tel:/i.test(v)) return v;
    return null;
  }

  /* -- Card ---------------------------------------------------------------- */

  function buildCard(item, index) {
    var date = parseDate(item.date);

    var card = document.createElement('article');
    card.className = 'announce' + (item.pinned ? ' announce--pinned' : '');
    if (item.id) card.id = 'note-' + String(item.id);
    card.setAttribute('data-reveal', '');
    card.style.setProperty('--reveal-delay', (index * 80) + 'ms');

    /* Meta row: tag, date, freshness */
    var meta = text('div', 'announce__meta');

    if (item.pinned) {
      var pin = text('span', 'announce__pin', 'Pinned');
      meta.appendChild(pin);
    }
    if (item.tag) {
      meta.appendChild(text('span', 'announce__tag', item.tag));
    }
    if (date) {
      var time = text('time', 'announce__date', formatDate(date));
      time.setAttribute('datetime', item.date);
      meta.appendChild(time);
      meta.appendChild(text('span', 'announce__rel', relative(date)));
    }
    card.appendChild(meta);

    /* Title */
    if (item.title) {
      card.appendChild(text('h3', 'announce__title', item.title));
    }

    /* Body — blank lines become paragraphs. */
    if (item.body) {
      var body = text('div', 'announce__body');
      String(item.body).split(/\n\s*\n/).forEach(function (para) {
        var p = para.trim();
        if (p) body.appendChild(text('p', null, p));
      });
      card.appendChild(body);
    }

    /* Optional call to action */
    var href = item.link && safeHref(item.link.href);
    if (href && item.link.text) {
      var a = text('a', 'btn announce__cta', item.link.text);
      a.href = href;
      if (/^https?:/i.test(href)) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
      card.appendChild(a);
    }

    return card;
  }

  /* -- Render -------------------------------------------------------------- */

  function render(list) {
    mount.textContent = '';

    if (!list.length) {
      var empty = text('p', 'announce__empty',
        'No announcements right now — check back soon, or follow along on ' +
        'social media below.');
      mount.appendChild(empty);
      return;
    }

    var frag = document.createDocumentFragment();
    list.forEach(function (item, i) { frag.appendChild(buildCard(item, i)); });
    mount.appendChild(frag);

    /* The reveal observer in main.js has already swept the document by the
       time this fetch resolves, so these cards would otherwise sit at
       opacity 0 forever. Announce them so they get picked up. */
    window.dispatchEvent(new CustomEvent('content:added', {
      detail: { container: mount }
    }));
  }

  function sortAndFilter(items) {
    var today = new Date();
    today.setHours(0, 0, 0, 0);

    return items
      .filter(function (it) {
        if (!it || typeof it !== 'object') return false;
        var exp = parseDate(it.expires);
        return !exp || exp >= today;
      })
      .sort(function (a, b) {
        if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
        var da = parseDate(a.date), db = parseDate(b.date);
        return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
      });
  }

  fetch(SOURCE, { cache: 'no-cache' })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      var items = (data && data.announcements) || [];
      render(sortAndFilter(items));
    })
    .catch(function (err) {
      /* A missing or malformed content file must not leave a blank hole in
         the page — show the fallback that is already in the markup. */
      mount.textContent = '';
      mount.appendChild(text('p', 'announce__empty',
        'Announcements are unavailable right now. Please call or email us ' +
        'and we will fill you in.'));
      if (window.console) console.warn('[announcements]', err);
    });
})();
