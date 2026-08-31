/* ==========================================================================
   social.js — Facebook and Instagram feed embeds, behind a consent gate
   --------------------------------------------------------------------------
   WHAT ACTUALLY WORKS, as of this build:

   FACEBOOK — the Page Plugin is official, free, and needs no API key or
   token. Give it a Page URL and it renders that Page's recent timeline posts
   in an iframe. Configure via data-fb-page on the placeholder in index.html.
   It shows FACEBOOK posts only. There is no Facebook widget that displays
   Instagram posts; the two feeds are separate products and always have been.

   INSTAGRAM — there is no free official feed embed any more. The Instagram
   Basic Display API, which is what most "free Instagram feed" tutorials
   describe, was shut down on 4 December 2024. Your options today:

     a) A hosted widget provider (Behold, LightWidget, SnapWidget, Elfsight,
        EmbedSocial). They handle the token and refresh. Typically a few
        dollars a month, and the fastest route. Adapters for all five are
        below — set data-ig-provider and data-ig-id and you are done.

     b) Instagram Graph API yourself. Needs an Instagram Professional
        (Business or Creator) account linked to a Facebook Page, a Meta app,
        and a long-lived token that must be refreshed every 60 days. The
        token cannot live in this file — it would be public — so it needs a
        small serverless function to proxy the call. Point data-ig-provider
        at "custom" and data-ig-endpoint at that function; it should return
        { items: [ { image, permalink, caption } ] }.

   THE CONSENT GATE — both embeds load third-party scripts that set cookies
   and profile the visitor. Loading them on every page view would undo this
   site's "no third-party runtime requests" property, add roughly 200KB
   before anyone has asked to see a feed, and create a GDPR problem. So each
   panel renders a lightweight preview card and only loads the real embed
   when the visitor clicks. The choice is remembered per visitor.

   Set data-autoload="true" on a panel to skip the gate — only do that if the
   client has accepted the privacy implications.
   ========================================================================== */

(function () {
  'use strict';

  var STORE_KEY = 'cc-social-consent';

  /* -- Consent memory ------------------------------------------------------ */

  function remembered(kind) {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return false;
      return JSON.parse(raw)[kind] === true;
    } catch (e) {
      return false;   // private mode, blocked storage — just gate again
    }
  }

  function remember(kind) {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      var obj = raw ? JSON.parse(raw) : {};
      obj[kind] = true;
      localStorage.setItem(STORE_KEY, JSON.stringify(obj));
    } catch (e) { /* not important enough to fail on */ }
  }

  /* -- Script loading ------------------------------------------------------ */

  var loaded = {};

  function loadScript(src, attrs) {
    if (loaded[src]) return loaded[src];

    loaded[src] = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.defer = true;
      s.crossOrigin = 'anonymous';
      if (attrs) {
        Object.keys(attrs).forEach(function (k) { s.setAttribute(k, attrs[k]); });
      }
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('Failed to load ' + src)); };
      document.body.appendChild(s);
    });

    return loaded[src];
  }

  /* -- Facebook ------------------------------------------------------------ */

  function mountFacebook(panel, body) {
    var page = panel.dataset.fbPage;
    if (!page) {
      return fail(body, 'No Facebook Page URL set. Add data-fb-page to this ' +
        'panel in index.html.');
    }

    var tabs = panel.dataset.fbTabs || 'timeline';
    var height = parseInt(panel.dataset.fbHeight, 10) || 620;

    /* The plugin sizes itself to its container's width, so measure first. */
    var width = Math.max(180, Math.min(500, Math.floor(body.clientWidth)));

    var holder = document.createElement('div');
    holder.className = 'fb-page';
    holder.setAttribute('data-href', page);
    holder.setAttribute('data-tabs', tabs);
    holder.setAttribute('data-width', String(width));
    holder.setAttribute('data-height', String(height));
    holder.setAttribute('data-small-header', 'false');
    holder.setAttribute('data-adapt-container-width', 'true');
    holder.setAttribute('data-hide-cover', 'false');
    holder.setAttribute('data-show-facepile', 'true');

    /* Graceful degradation built into the plugin itself: this blockquote is
       what shows if the SDK is blocked by an extension or fails to load. */
    var bq = document.createElement('blockquote');
    bq.className = 'fb-xfbml-parse-ignore';
    bq.cite = page;
    var a = document.createElement('a');
    a.href = page;
    a.textContent = 'Cape Codder Building & Remodeling on Facebook';
    bq.appendChild(a);
    holder.appendChild(bq);

    body.textContent = '';
    body.appendChild(holder);

    if (!document.getElementById('fb-root')) {
      var r = document.createElement('div');
      r.id = 'fb-root';
      document.body.insertBefore(r, document.body.firstChild);
    }

    return loadScript(
      'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v21.0'
    ).then(function () {
      /* If the SDK was already on the page from a previous mount, it will not
         re-scan on its own. */
      if (window.FB && window.FB.XFBML) window.FB.XFBML.parse(body);
    });
  }

  /* -- Instagram ----------------------------------------------------------- */

  /* Each provider hands you an id and a snippet; these adapters normalise
     them so index.html only ever needs data-ig-provider + data-ig-id. */
  var IG_PROVIDERS = {

    behold: function (panel, body, id) {
      var d = document.createElement('div');
      d.setAttribute('data-behold-id', id);
      body.textContent = '';
      body.appendChild(d);
      return loadScript('https://w.behold.so/widget.js', { type: 'module' });
    },

    lightwidget: function (panel, body, id) {
      var f = document.createElement('iframe');
      f.src = 'https://cdn.lightwidget.com/widgets/' + encodeURIComponent(id) + '.html';
      f.className = 'lightwidget-widget';
      f.scrolling = 'no';
      f.allowTransparency = 'true';
      f.title = 'Instagram feed';
      f.style.width = '100%';
      f.style.border = '0';
      f.style.overflow = 'hidden';
      f.style.minHeight = '420px';
      body.textContent = '';
      body.appendChild(f);
      return loadScript('https://cdn.lightwidget.com/widgets/lightwidget.js');
    },

    snapwidget: function (panel, body, id) {
      var f = document.createElement('iframe');
      f.src = 'https://snapwidget.com/embed/' + encodeURIComponent(id);
      f.className = 'snapwidget-widget';
      f.title = 'Instagram feed';
      f.allowTransparency = 'true';
      f.frameBorder = '0';
      f.scrolling = 'no';
      f.style.border = 'none';
      f.style.overflow = 'hidden';
      f.style.width = '100%';
      f.style.minHeight = '420px';
      body.textContent = '';
      body.appendChild(f);
      return Promise.resolve();
    },

    elfsight: function (panel, body, id) {
      var d = document.createElement('div');
      d.className = 'elfsight-app-' + id;
      body.textContent = '';
      body.appendChild(d);
      return loadScript('https://static.elfsight.com/platform/platform.js');
    },

    embedsocial: function (panel, body, id) {
      var d = document.createElement('div');
      d.className = 'embedsocial-hashtag';
      d.setAttribute('data-ref', id);
      body.textContent = '';
      body.appendChild(d);
      return loadScript('https://embedsocial.com/cdn/ht.js');
    },

    /* Your own serverless proxy. Expected shape:
       { items: [ { image, permalink, caption } ] } */
    custom: function (panel, body, id) {
      var endpoint = panel.dataset.igEndpoint;
      if (!endpoint) {
        return Promise.reject(new Error('data-ig-endpoint is required for ' +
          'the "custom" provider.'));
      }
      return fetch(endpoint, { cache: 'no-cache' })
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .then(function (json) {
          var items = (json && json.items) || [];
          if (!items.length) throw new Error('Feed returned no posts.');

          var grid = document.createElement('div');
          grid.className = 'ig-grid';

          items.slice(0, 9).forEach(function (item) {
            if (!item || typeof item.image !== 'string') return;
            var a = document.createElement('a');
            a.className = 'ig-cell';
            a.href = /^https?:\/\//i.test(item.permalink || '')
              ? item.permalink : 'https://www.instagram.com/';
            a.target = '_blank';
            a.rel = 'noopener noreferrer';

            var img = document.createElement('img');
            img.src = item.image;
            img.loading = 'lazy';
            img.decoding = 'async';
            img.alt = item.caption
              ? String(item.caption).slice(0, 120)
              : 'Instagram post';
            a.appendChild(img);
            grid.appendChild(a);
          });

          body.textContent = '';
          body.appendChild(grid);
        });
    }
  };

  function mountInstagram(panel, body) {
    var provider = (panel.dataset.igProvider || '').toLowerCase();
    var id = panel.dataset.igId;

    if (!provider) {
      return fail(body,
        'No Instagram provider configured yet. Instagram removed its free ' +
        'feed embed in December 2024, so this panel needs either a widget ' +
        'provider or your own Graph API proxy. See the notes at the top of ' +
        'assets/js/social.js.');
    }

    var adapter = IG_PROVIDERS[provider];
    if (!adapter) {
      return fail(body, 'Unknown Instagram provider "' + provider + '". ' +
        'Supported: ' + Object.keys(IG_PROVIDERS).join(', ') + '.');
    }
    if (provider !== 'custom' && !id) {
      return fail(body, 'data-ig-id is required for the "' + provider +
        '" provider.');
    }

    return adapter(panel, body, id);
  }

  /* -- Shared -------------------------------------------------------------- */

  function fail(body, message) {
    body.textContent = '';
    var p = document.createElement('p');
    p.className = 'social__note';
    p.textContent = message;
    body.appendChild(p);
    return Promise.resolve();
  }

  function activate(panel) {
    var body = panel.querySelector('[data-social-body]');
    var gate = panel.querySelector('[data-social-gate]');
    var kind = panel.dataset.social;
    if (!body) return;

    if (gate) gate.hidden = true;
    body.hidden = false;

    panel.classList.add('is-live');
    body.setAttribute('aria-busy', 'true');
    body.innerHTML = '<p class="social__note">Loading\u2026</p>';

    var job = kind === 'facebook'
      ? mountFacebook(panel, body)
      : mountInstagram(panel, body);

    job.catch(function (err) {
      /* A network failure is worth a retry (blocked extension, flaky
         connection); a misconfiguration is not, and mountX has already
         written a specific explanation via fail() in that case. */
      fail(body, 'That feed could not be loaded. It may be blocked by a ' +
        'privacy extension or an ad blocker.');
      if (gate) {
        var again = gate.querySelector('[data-social-load]');
        if (again) again.textContent = 'Try again';
        gate.hidden = false;
      }
      panel.classList.remove('is-live');
      if (window.console) console.warn('[social:' + kind + ']', err);
    }).then(function () {
      body.removeAttribute('aria-busy');
    });
  }

  /* -- Boot ---------------------------------------------------------------- */

  var panels = document.querySelectorAll('[data-social]');

  Array.prototype.forEach.call(panels, function (panel) {
    var kind = panel.dataset.social;
    var btn = panel.querySelector('[data-social-load]');

    var auto = panel.dataset.autoload === 'true';

    if (auto || remembered(kind)) {
      activate(panel);
      return;
    }

    if (btn) {
      btn.addEventListener('click', function () {
        remember(kind);
        activate(panel);
      });
    }
  });
})();
