/* ============================================================
   Cape Codder Building & Remodeling — Quiz Funnel Engine
   Reads window.FUNNEL config and renders a Perspective-style
   step-by-step quiz: intro → questions → lead form → thanks.
   ============================================================ */
(function () {
  "use strict";

  /* ============================================================
     LEAD DELIVERY — set ONE of these and every funnel uses it.
     1) LEAD_ENDPOINT: any webhook that accepts JSON POSTs.
        - Email-to-inbox (free, 2 min): activate at formsubmit.co, then
          "https://formsubmit.co/ajax/capecodderhi@gmail.com"
        - GoHighLevel: Workflow → Inbound Webhook trigger → paste URL here
        - Zapier: Catch Hook URL
        A per-funnel `endpoint` in a page's FUNNEL config overrides this.
     2) Leave blank: falls back to opening the visitor's email app
        addressed to BRAND.email (works, but relies on the visitor).
     See README.md for the exact JSON field list you can map.
     ============================================================ */
  var LEAD_ENDPOINT = "https://services.leadconnectorhq.com/hooks/BbtQuQztOugpY9lxrsiO/webhook-trigger/c4afc70b-02ff-47c5-8d88-ec6315faec22";

  // Filled by build.py with data URIs when official partner logo files
  // (harvey-logo.png / andersen-logo.png) exist next to the source pages.
  var PARTNER_LOGOS = {};

  var BRAND = {
    name: "CAPE CODDER",
    sub: "Building & Remodeling",
    phone: "(774) 408-6091",
    phoneHref: "tel:+17744086091",
    email: "capecodderhi@gmail.com",
    site: "capecodderinc.com",
    area: "Proudly serving Cape Cod & the Islands, the South Shore, and the Greater Boston area.",
    fave: "⭐ 2024 Nextdoor Neighborhood Fave",
    logo: "logo.png"
  };

  /* ---------- Icon library (24x24 stroke) ---------- */
  var ICONS = {
    window:   '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M12 3v18M4 12h16"/>',
    door:     '<path d="M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17M3 21h18"/><circle cx="15.2" cy="12" r=".9"/>',
    slider:   '<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M12 3v18M7 11v2M17 11v2"/>',
    both:     '<path d="M3 21V5a1 1 0 0 1 1-1h7v17M3 21h18M14 21V8h6a1 1 0 0 1 1 1v12"/><path d="M17.5 13.5v1"/>',
    house:    '<path d="M3 11l9-8 9 8M5 9.5V21h14V9.5M10 21v-6h4v6"/>',
    condo:    '<path d="M4 21V7l6-4v18M10 21V9l6-3v15M16 21V9l4 2v10M2 21h20"/>',
    building: '<rect x="5" y="3" width="14" height="18"/><path d="M2 21h20M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01"/>',
    store:    '<path d="M4 10l1-6h14l1 6M4 10v11h16V10M4 10h16M9 21v-6h6v6"/>',
    roof:     '<path d="M2 13L12 3l10 10M6 9.5l6 6 6-6"/>',
    shingle:  '<path d="M3 6h18M3 10h18M3 14h18M3 18h18M7 6v4M12 10v4M7 14v4M17 6v4M17 14v4"/>',
    metal:    '<path d="M3 20L12 4l9 16M8.5 12h7M6.5 16h11"/>',
    cedar:    '<path d="M4 4h16v4H4zM5 8h14v4H5zM6 12h12v4H6zM7 16h10v4H7z"/>',
    vinyl:    '<path d="M3 7h18M3 12h18M3 17h18M3 7l2 5-2 5M21 7l-2 5 2 5"/>',
    hardie:   '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M3 12h18M9 5v7M15 12v7"/>',
    drop:     '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>',
    warn:     '<path d="M12 3l10 18H2L12 3zM12 10v4M12 17.5h.01"/>',
    clock:    '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    search:   '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    bolt:     '<path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"/>',
    sound:    '<path d="M4 9v6h4l6 5V4L8 9H4zM17 8a5 5 0 0 1 0 8"/>',
    star:     '<path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17l-6.1 3.6 1.4-6.8L2.2 9.1l6.9-.8L12 2z"/>',
    shield:   '<path d="M12 2l8 3v7c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V5l8-3z"/>',
    dollar:   '<circle cx="12" cy="12" r="9"/><path d="M12 6.5v11M15 8.8c-.6-1-1.7-1.5-3-1.5-1.7 0-3 .9-3 2.2 0 3 6 1.6 6 4.6 0 1.3-1.3 2.2-3 2.2-1.3 0-2.4-.5-3-1.5"/>',
    gem:      '<path d="M6 3h12l4 6-10 12L2 9l4-6zM2 9h20M9.5 3L8 9l4 12M14.5 3L16 9l-4 12"/>',
    wrench:   '<path d="M14.7 6.3a4.5 4.5 0 0 0-6 6L3 18l3 3 5.7-5.7a4.5 4.5 0 0 0 6-6L14 13l-3-3 3.7-3.7z"/>',
    hammer:   '<path d="M14 4l6 6-2 2-6-6 2-2zM12 6L3 15l3 3 9-9M9 3l4 1"/>',
    layout:   '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 10h18M10 10v11"/>',
    sparkle:  '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3zM19 16l.9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9L19 16z"/>',
    cabinet:  '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M4 12h16M10.5 7.5h3M10.5 16.5h3"/>',
    counter:  '<path d="M3 8h18v3H3zM5 11v10M19 11v10M9 15h3"/>',
    island:   '<path d="M4 9h16v4H4zM6 13v8M18 13v8M9 5h6v4H9z"/>',
    paint:    '<path d="M19 6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v2zM19 5h2v5l-8 2v3"/><rect x="11" y="15" width="4" height="6" rx="1"/>',
    tub:      '<path d="M3 12h18v3a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3zM5 12V5a2 2 0 0 1 4 0M6 21l-1 1.5M18 21l1 1.5"/>',
    shower:   '<path d="M5 21V5a3 3 0 0 1 6 0M11 5h3M9 10h10M11 14v.01M14 14v.01M17 14v.01M12 17v.01M16 17v.01"/>',
    vanity:   '<circle cx="12" cy="6" r="3"/><path d="M4 12h16v3H4zM6 15v6M18 15v6M10 18h4"/>',
    tile:     '<path d="M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z"/>',
    access:   '<circle cx="12" cy="5" r="2"/><path d="M12 7v6l5 2M12 10h-5M8 21a5 5 0 0 1 4-8"/><path d="M15 17a4 4 0 1 1-6.6-3"/>',
    leaf:     '<path d="M5 21C5 12 12 4 21 4c0 9-7 16-16 16M5 21c3-5 7-9 12-12"/>',
    check:    '<path d="M20 6L9 17l-5-5"/>',
    phone:    '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.13.97.36 1.9.7 2.8a2 2 0 0 1-.45 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.45c.9.34 1.83.57 2.8.7A2 2 0 0 1 22 16.9z"/>',
    lock:     '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    ruler:    '<path d="M3 17L17 3l4 4L7 21l-4-4zM8 16l1.5 1.5M11 13l1.5 1.5M14 10l1.5 1.5M17 7l1.5 1.5"/>',
    question: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 .3c0 1.7-2.5 2.2-2.5 4M12 17h.01"/>',
    refresh:  '<path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6"/>',
    plus:     '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
    snow:     '<path d="M12 2v20M4.9 6l14.2 12M19.1 6L4.9 18M9 4l3 2 3-2M9 20l3-2 3 2M3.5 9.5l2.5 2.5-2.5 2.5M20.5 9.5L18 12l2.5 2.5"/>',
    wave:     '<path d="M2 12c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3M2 18c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3"/>'
  };

  function icon(name, size) {
    var s = size || 24;
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || ICONS.sparkle) + '</svg>';
  }

  var app = document.getElementById("app");
  var progressBar = document.getElementById("progress-bar");

  // Flow: -1 = intro, 0..n-1 = questions, n = lead form, n+1 = thanks
  var F = { steps: [] };
  var state = { idx: -1, answers: {}, done: false };
  var totalSteps = 1;

  // Boot (or re-boot) the engine with a funnel config. Multi-quiz pages
  // call window.CCBoot(config) each time the visitor picks a trade.
  function boot(config) {
    F = config;
    state = { idx: -1, answers: {}, done: false };
    totalSteps = F.steps.length + 1; // questions + lead form
    renderPartners();
    render();
  }

  /* ---------- Chrome (topbar + footer + partners), rendered once ---------- */
  function renderChrome() {
    var topbar = document.getElementById("topbar");
    if (topbar) {
      topbar.innerHTML =
        '<div class="topbar-inner">' +
          '<a class="brand" href="index.html" aria-label="Cape Codder Building & Remodeling">' +
            '<img class="brand-logo" src="' + BRAND.logo + '" alt="">' +
            '<span class="brand-name"><span class="top">' + BRAND.name + '</span><br><span class="sub">' + BRAND.sub + '</span></span>' +
          '</a>' +
          '<a class="topbar-phone" href="' + BRAND.phoneHref + '">' + icon("phone", 16) + '<span class="lbl">' + BRAND.phone + '</span></a>' +
        '</div>' +
        '<div class="progress-wrap"><div class="progress-bar" id="progress-bar"></div></div>';
      progressBar = document.getElementById("progress-bar");
    }
    var footer = document.getElementById("site-footer");
    if (footer) {
      footer.innerHTML =
        '<div class="footer-inner">' +
          '<img class="brand-logo lg" src="' + BRAND.logo + '" alt="Cape Codder Building & Remodeling">' +
          '<div class="footer-links">' +
            '<a href="' + BRAND.phoneHref + '">' + BRAND.phone + '</a>' +
            '<a href="mailto:' + BRAND.email + '">' + BRAND.email + '</a>' +
            '<a href="https://' + BRAND.site + '">' + BRAND.site + '</a>' +
          '</div>' +
          '<div class="footer-area">' + BRAND.area + '</div>' +
          '<div class="footer-fave">' + BRAND.fave + '</div>' +
          '<div class="footer-area">© ' + new Date().getFullYear() + ' Cape Codder Building & Remodeling INC</div>' +
        '</div>';
    }
  }

  function renderPartners() {
    var partners = document.getElementById("partners");
    if (!partners) return;
    if (!F.partners) { partners.innerHTML = ""; return; }
    // Drop official harvey-logo.png / andersen-logo.png files next to this
    // page (then re-run build.py) and they replace the monogram fallbacks.
    var badge = function (slug, name, sub) {
      return '<div class="partner-badge">' +
        '<img class="pb-logo" src="' + (PARTNER_LOGOS[slug] || slug + "-logo.png") + '" alt="' + name + '" ' +
          'onerror="this.style.display=&quot;none&quot;;this.nextElementSibling.style.display=&quot;grid&quot;">' +
        '<span class="pb-mark ' + slug + '" style="display:none">' + name.charAt(0) + '</span>' +
        '<span><span class="pb-name">' + name + '</span><br><span class="pb-sub">' + sub + '</span></span></div>';
    };
    partners.innerHTML =
      '<div class="lbl">Proud Installer Of</div>' +
      '<div class="partner-badges">' +
        badge("harvey", "Harvey", "Building Products — Windows & Doors") +
        badge("andersen", "Andersen", "Windows & Doors") +
      '</div>';
  }

  /* ---------- Progress ---------- */
  function setProgress() {
    var pct = 0;
    if (state.idx >= 0) pct = Math.min(100, Math.round(((state.idx + (state.done ? 1 : 0)) / totalSteps) * 100));
    if (state.done) pct = 100;
    if (progressBar) progressBar.style.width = pct + "%";
  }

  /* ---------- Step transition ---------- */
  function swap(html, focusSel) {
    var current = app.firstElementChild;
    var apply = function () {
      app.innerHTML = html;
      wire();
      setProgress();
      var f = focusSel && app.querySelector(focusSel);
      if (f) f.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    if (current) {
      current.classList.add("leaving");
      setTimeout(apply, 240);
    } else {
      apply();
    }
  }

  function metaBar(showBack, label) {
    return '<div class="step-meta">' +
      '<button type="button" class="back-btn' + (showBack ? " show" : "") + '" data-act="back">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Back</button>' +
      '<span class="step-count">' + (label || "") + '</span></div>';
  }

  /* ---------- Screens ---------- */
  function introHTML() {
    var b = F.intro.bullets.map(function (t) {
      return '<li><span class="tick">' + icon("check", 13) + '</span>' + t + "</li>";
    }).join("");
    return '<div class="step-card intro">' +
      (window.onFunnelExit ? metaBar(true, "") : "") +
      '<div class="intro-kicker">' + icon("sparkle", 14) + F.intro.kicker + "</div>" +
      "<h1>" + F.intro.headline + "</h1>" +
      '<p class="sub">' + F.intro.sub + "</p>" +
      '<ul class="intro-bullets">' + b + "</ul>" +
      '<button type="button" class="cta-btn" data-act="start">' + F.intro.cta + ' <span class="arrow">→</span></button>' +
      '<br><button type="button" class="ghost-btn" data-act="skip">Skip to free estimate</button>' +
      '<p class="intro-note">' + icon("clock", 12) + " Takes about 60 seconds · 100% free, no obligation</p>" +
      '<div class="intro-trust">' +
        "<span>" + icon("star", 15) + " 2024 Nextdoor Neighborhood Fave</span>" +
        "<span>" + icon("shield", 15) + " Certified General Contractors</span>" +
        "<span>" + icon("wave", 15) + " Cape Cod · South Shore · Boston</span>" +
      "</div></div>";
  }

  function questionHTML(step, qi) {
    if (step.textarea) {
      return '<div class="step-card">' +
        metaBar(true, "Step " + (qi + 1) + " of " + totalSteps) +
        '<h2 class="q-title">' + step.title + "</h2>" +
        (step.sub ? '<p class="q-sub">' + step.sub + "</p>" : "") +
        '<div class="q-textarea-wrap"><textarea id="qa-text" class="q-textarea" rows="6" placeholder="' +
          (step.placeholder || "Tell us about your project…") + '">' +
          (state.answers[step.id] || "") + "</textarea></div>" +
        '<div class="multi-actions"><button type="button" class="cta-btn" data-act="next">Continue <span class="arrow">→</span></button>' +
        (step.optionalNote ? '<span class="multi-hint">' + step.optionalNote + "</span>" : "") +
        "</div></div>";
    }
    var opts = step.options.map(function (o, i) {
      var picked = Array.isArray(state.answers[step.id]) ?
        state.answers[step.id].indexOf(o.label) > -1 : state.answers[step.id] === o.label;
      return '<button type="button" class="opt' + (picked ? " selected" : "") + '" role="' + (step.multi ? "checkbox" : "radio") + '" aria-checked="' + picked + '" data-opt="' + i + '">' +
        '<span class="opt-icon">' + icon(o.icon) + "</span>" +
        "<span><span class=\"opt-label\">" + o.label + "</span>" +
        (o.sub ? '<br><span class="opt-sub">' + o.sub + "</span>" : "") + "</span>" +
        '<span class="opt-check">' + icon("check", 12) + "</span></button>";
    }).join("");
    return '<div class="step-card">' +
      metaBar(true, "Step " + (qi + 1) + " of " + totalSteps) +
      '<h2 class="q-title">' + step.title + "</h2>" +
      (step.sub ? '<p class="q-sub">' + step.sub + "</p>" : "") +
      '<div class="opts' + (step.options.length <= 3 ? " cols-1" : "") + '">' + opts + "</div>" +
      (step.multi ?
        '<div class="multi-actions"><button type="button" class="cta-btn" data-act="next">Continue <span class="arrow">→</span></button>' +
        '<span class="multi-hint">Select all that apply</span></div>' : "") +
      "</div>";
  }

  function formHTML() {
    var chips = F.steps.map(function (s) {
      var a = state.answers[s.id];
      if (!a || (Array.isArray(a) && !a.length)) return "";
      var t = Array.isArray(a) ? a.join(" · ") : a;
      if (t.length > 48) t = t.slice(0, 47) + "…";
      return '<span class="chip">' + t + "</span>";
    }).join("");
    return '<div class="step-card">' +
      metaBar(true, "Last step") +
      '<h2 class="q-title">' + (F.form && F.form.title || "Where should we send your free quote?") + "</h2>" +
      '<p class="q-sub">' + (F.form && F.form.sub || "A real person from our team will reach out — usually within one business day.") + "</p>" +
      '<div class="summary-chips">' + chips + "</div>" +
      '<form class="lead-form" novalidate>' +
        '<div class="lead-row">' +
          '<div class="lead-field" data-f="name"><label for="lf-name">Full name</label>' +
            '<input id="lf-name" name="name" type="text" autocomplete="name" placeholder="Jane Smith" required>' +
            '<span class="err">Please enter your name</span></div>' +
          '<div class="lead-field" data-f="phone"><label for="lf-phone">Phone</label>' +
            '<input id="lf-phone" name="phone" type="tel" autocomplete="tel" placeholder="(508) 555-0123" required>' +
            '<span class="err">Please enter a valid phone number</span></div>' +
        "</div>" +
        '<div class="lead-field" data-f="email"><label for="lf-email">Email</label>' +
          '<input id="lf-email" name="email" type="email" autocomplete="email" placeholder="jane@email.com" required>' +
          '<span class="err">Please enter a valid email</span></div>' +
        '<div class="lead-field" data-f="town"><label for="lf-town">Town / ZIP <span style="text-transform:none;letter-spacing:0;">(optional)</span></label>' +
          '<input id="lf-town" name="town" type="text" autocomplete="postal-code" placeholder="West Yarmouth, 02673"></div>' +
        '<button type="submit" class="cta-btn">' + (F.form && F.form.cta || "Get My Free Quote") + ' <span class="arrow">→</span></button>' +
        '<p class="lead-privacy">' + icon("lock", 14) + "Your information is private. We never sell your data — it goes straight to our local team.</p>" +
      "</form></div>";
  }

  // Personalized assessment: F.result = { urgentIf: {stepId: [labels]}, urgent, calm }
  function assessmentText() {
    var r = F.result;
    if (!r) return null;
    var urgent = false;
    Object.keys(r.urgentIf || {}).forEach(function (id) {
      var a = state.answers[id];
      var hits = Array.isArray(a) ? a : [a];
      hits.forEach(function (h) { if (r.urgentIf[id].indexOf(h) > -1) urgent = true; });
    });
    return urgent ? r.urgent : r.calm;
  }

  function thanksHTML() {
    var verdict = assessmentText();
    var rows = F.steps.map(function (s) {
      var a = state.answers[s.id];
      if (!a || (Array.isArray(a) && !a.length)) return "";
      return "<div><span>" + (s.short || s.title.replace(/<[^>]*>/g, "")) + "</span><strong>" +
        (Array.isArray(a) ? a.join(", ") : a) + "</strong></div>";
    }).join("");
    return '<div class="step-card thanks">' +
      '<div class="thanks-badge">' + icon("check", 44) + "</div>" +
      '<h2>Your assessment is <span class="script">complete</span></h2>' +
      "<p>Thanks for telling us about your " + (F.projectNoun || "project") + ". Our team will review your answers and reach out shortly with your free, no-obligation quote.</p>" +
      (verdict ? '<div class="result-box">' + verdict + "</div>" : "") +
      (rows ? '<div class="result-summary">' + rows + "</div>" : "") +
      '<div class="thanks-call">' +
        (F.bookingUrl ? '<a class="cta-btn" href="' + F.bookingUrl + '">Book My Free Estimate <span class="arrow">→</span></a>' : "") +
        '<a class="' + (F.bookingUrl ? "ghost-btn" : "cta-btn") + '" href="' + BRAND.phoneHref + '">' + icon("phone", 16) + " Call " + BRAND.phone + "</a>" +
      "</div></div>";
  }

  function render() {
    if (state.done) return swap(thanksHTML());
    if (state.idx === -1) return swap(introHTML());
    if (state.idx < F.steps.length) return swap(questionHTML(F.steps[state.idx], state.idx));
    return swap(formHTML(), "#lf-name");
  }

  /* ---------- Events ---------- */
  function wire() {
    var startBtn = app.querySelector('[data-act="start"]');
    if (startBtn) startBtn.addEventListener("click", function () { state.idx = 0; render(); });

    var skipBtn = app.querySelector('[data-act="skip"]');
    if (skipBtn) skipBtn.addEventListener("click", function () { state.idx = F.steps.length; render(); });

    var backBtn = app.querySelector('[data-act="back"]');
    if (backBtn) backBtn.addEventListener("click", function () {
      if (state.idx > -1) { state.idx -= 1; render(); }
      else if (window.onFunnelExit) window.onFunnelExit(); // back to quiz picker
    });

    var step = state.idx > -1 && state.idx < F.steps.length ? F.steps[state.idx] : null;
    app.querySelectorAll("[data-opt]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var o = step.options[+btn.dataset.opt];
        if (step.multi) {
          var arr = state.answers[step.id] || (state.answers[step.id] = []);
          var at = arr.indexOf(o.label);
          if (at > -1) arr.splice(at, 1); else arr.push(o.label);
          btn.classList.toggle("selected", at === -1);
          btn.setAttribute("aria-checked", at === -1);
        } else {
          state.answers[step.id] = o.label;
          app.querySelectorAll("[data-opt]").forEach(function (b) { b.classList.remove("selected"); });
          btn.classList.add("selected");
          setTimeout(function () { state.idx += 1; render(); }, 280);
        }
      });
    });

    var nextBtn = app.querySelector('[data-act="next"]');
    if (nextBtn) nextBtn.addEventListener("click", function () {
      var ta = app.querySelector("#qa-text");
      if (ta && step) state.answers[step.id] = ta.value.trim();
      state.idx += 1; render();
    });

    var form = app.querySelector("form.lead-form");
    if (form) form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;
      var get = function (n) { return form.querySelector('[name="' + n + '"]').value.trim(); };
      var mark = function (n, bad) {
        form.querySelector('[data-f="' + n + '"]').classList.toggle("error", bad);
        if (bad) ok = false;
      };
      mark("name", get("name").length < 2);
      mark("phone", get("phone").replace(/\D/g, "").length < 10);
      mark("email", !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(get("email")));
      if (!ok) return;

      // Flat payload: every answer is a top-level q_* field, which makes
      // mapping trivial in GHL/Zapier. `summary` is a ready-made email body.
      // Field names mirror the site contact form's payload so one GHL
      // workflow maps both sources identically.
      var fullName = get("name");
      var nameParts = fullName.split(/\s+/);
      var lines = [];
      var lead = {
        _subject: "New lead: " + (F.projectNoun || "project") + " — " + fullName,
        funnel: F.slug,
        project: F.projectNoun || "project",
        first_name: nameParts[0] || "",
        last_name: nameParts.slice(1).join(" "),
        full_name: fullName,
        name: fullName, phone: get("phone"),
        email: get("email"), town: get("town"),
        source: "Quiz Funnel (/quiz) — " + (F.projectNoun || "project"),
        page_url: location.href,
        submitted_at: new Date().toISOString()
      };
      F.steps.forEach(function (s) {
        var a = state.answers[s.id];
        var v = Array.isArray(a) ? a.join(", ") : (a || "");
        lead["q_" + s.id] = v;
        if (v) lines.push((s.short || s.id) + ": " + v);
      });
      lead.summary =
        "New " + lead.project + " lead from " + BRAND.site + "\n\n" +
        "Name: " + lead.name + "\nPhone: " + lead.phone + "\nEmail: " + lead.email +
        "\nTown/ZIP: " + (lead.town || "-") + "\n\n" + lines.join("\n");

      var endpoint = F.endpoint || LEAD_ENDPOINT;
      if (endpoint) {
        fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify(lead)
        }).catch(function () {});
      } else {
        window.open("mailto:" + BRAND.email +
          "?subject=" + encodeURIComponent(lead._subject) +
          "&body=" + encodeURIComponent(lead.summary), "_self");
      }
      state.done = true;
      render();
    });
  }

  renderChrome();
  // Single-funnel pages define window.FUNNEL and boot immediately.
  // Hub/picker pages omit it (or set intro: null) and call CCBoot on demand.
  if (window.FUNNEL && window.FUNNEL.intro) boot(window.FUNNEL);

  window.CCIcon = icon;
  window.CCBoot = boot;
})();
