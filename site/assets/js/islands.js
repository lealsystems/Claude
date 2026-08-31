/* ==========================================================================
   islands.js — the animated Cape Cod seascape behind the page
   --------------------------------------------------------------------------
   Draws a layered, parallaxing horizon on a single <canvas>:

     sky gradient -> sun -> cloud bands -> four island/dune ridges ->
     water -> shimmer -> reflections -> sailboat -> gulls -> haze

   Each ridge is generated once from summed sine waves (a cheap, stable stand-in
   for value noise) and cached as a path, so per-frame work is transform +
   fill only. Layers drift at different speeds and respond to scroll and
   pointer position, which is what sells the depth.

   Colours are read from CSS custom properties, so the scene re-themes with
   the rest of the site instead of carrying its own palette.

   Honours prefers-reduced-motion by painting one static frame.
   ========================================================================== */

(function () {
  'use strict';

  var canvas = document.getElementById('sea');
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext('2d', { alpha: false });
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* -- State ------------------------------------------------------------- */

  var W = 0, H = 0, DPR = 1;
  var t = 0;                    // animation clock, seconds
  var scrollNorm = 0;           // 0..1 progress through the hero
  var pointer = { x: 0, y: 0 }; // -1..1, eased
  var target  = { x: 0, y: 0 };
  var running = false;
  var rafId = null;
  var lastStamp = 0;

  /* -- Palette ----------------------------------------------------------- */

  var css = getComputedStyle(document.documentElement);
  var P = {};

  function readPalette() {
    css = getComputedStyle(document.documentElement);
    [
      'sky-top', 'sky-mid', 'sky-low', 'sun',
      'sea-far', 'sea-near',
      'isle-far', 'isle-mid', 'isle-near', 'isle-fore'
    ].forEach(function (k) {
      P[k] = (css.getPropertyValue('--' + k) || '').trim() || '#888';
    });
  }

  /* -- Ridge generation --------------------------------------------------- */

  /* A deterministic pseudo-random so the coastline is identical on every
     load and every reload — a shoreline that reshuffles looks like a bug. */
  function seeded(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  /* Build one silhouette as an array of normalised heights (0 = sea level,
     1 = tall). Summed octaves of sine give rolling dune shapes; the
     `islands` flag punches the ridge below sea level in places so the layer
     reads as separate islands rather than one continuous coast. */
  function makeRidge(opts) {
    var rnd = seeded(opts.seed);
    var pts = opts.points;
    var oct = [];

    for (var o = 0; o < 4; o++) {
      oct.push({
        freq: (1 + o * 1.9) * opts.freq,
        amp: 1 / Math.pow(1.85, o),
        phase: rnd() * Math.PI * 2
      });
    }

    var heights = new Float32Array(pts);
    var max = 0;

    for (var i = 0; i < pts; i++) {
      var u = i / (pts - 1);
      var v = 0;
      for (var j = 0; j < oct.length; j++) {
        var f = oct[j];
        v += Math.sin(u * Math.PI * 2 * f.freq + f.phase) * f.amp;
      }
      v = (v + 1.6) / 3.2;                 // roughly 0..1
      if (v < 0) v = 0;

      /* Carve channels of open water between land masses. */
      if (opts.islands) {
        var gap = Math.sin(u * Math.PI * 2 * opts.gapFreq + opts.gapPhase);
        var mask = (gap - opts.gapCut) / (1 - opts.gapCut);
        v *= mask > 0 ? Math.pow(mask, 0.62) : 0;
      }

      heights[i] = v;
      if (v > max) max = v;
    }

    if (max > 0) {
      for (var k = 0; k < pts; k++) heights[k] /= max;
    }
    return heights;
  }

  /* Layer definitions, far to near.

     These are Cape Cod islands and sandbars, not mountains: `h` (peak height
     as a fraction of canvas height) stays tiny, and `freq` stays low, so each
     ridge reads as a long low spit of land rather than a row of peaks.

     `lift` is the baseline's offset above the horizon, also as a fraction of
     height. Every layer is anchored to the horizon and then painted over by
     the sea, so the land sits *on* the waterline with open water in front of
     it instead of filling the bottom of the frame.

     `gapCut` decides how much of each ridge is punched below sea level — the
     higher the cut, the more separate islands and the more open water. */
  var LAYERS = [
    { key: 'isle-far',  seed: 2113, freq: 0.9, points: 260, lift: 0.006, h: 0.046,
      speed: 0.0030, depth: 0.14, islands: true, gapFreq: 1.3, gapPhase: 0.7, gapCut: -0.05, alpha: 0.62 },
    { key: 'isle-mid',  seed: 5077, freq: 1.2, points: 300, lift: 0.002, h: 0.062,
      speed: 0.0058, depth: 0.26, islands: true, gapFreq: 1.9, gapPhase: 2.1, gapCut: 0.08, alpha: 0.82 },
    { key: 'isle-near', seed: 9241, freq: 1.6, points: 340, lift: -0.004, h: 0.078,
      speed: 0.0098, depth: 0.44, islands: true, gapFreq: 2.5, gapPhase: 4.4, gapCut: 0.20, alpha: 0.95 }
  ];

  /* The dune bank in the very foreground — the shore we are standing on.
     Drawn last, over the water, anchored to the bottom of the frame. */
  var DUNE = {
    key: 'isle-fore', seed: 1583, freq: 2.2, points: 380, h: 0.05,
    speed: 0.021, depth: 0.9, islands: false, gapFreq: 1, gapPhase: 0, gapCut: 0
  };

  LAYERS.forEach(function (L) { L.data = makeRidge(L); });
  DUNE.data = makeRidge(DUNE);

  /* Sample a ridge with wrap-around, so drift is seamless. */
  function ridgeAt(L, u) {
    var d = L.data;
    var n = d.length;
    var x = ((u % 1) + 1) % 1 * (n - 1);
    var i = Math.floor(x);
    var f = x - i;
    var a = d[i % n];
    var b = d[(i + 1) % n];
    return a + (b - a) * f;      // linear is fine at these point counts
  }

  /* -- Clouds -------------------------------------------------------------- */

  var CLOUDS = (function () {
    var rnd = seeded(4242);
    var out = [];
    for (var i = 0; i < 9; i++) {
      out.push({
        x: rnd(),
        y: 0.08 + rnd() * 0.34,
        w: 0.13 + rnd() * 0.26,
        h: 0.012 + rnd() * 0.03,
        speed: 0.0045 + rnd() * 0.011,
        alpha: 0.16 + rnd() * 0.3,
        depth: 0.1 + rnd() * 0.25
      });
    }
    return out;
  })();

  /* -- Gulls --------------------------------------------------------------- */

  var GULLS = (function () {
    var rnd = seeded(808);
    var out = [];
    for (var i = 0; i < 5; i++) {
      out.push({
        x: rnd(),
        y: 0.14 + rnd() * 0.3,
        speed: 0.012 + rnd() * 0.02,
        scale: 0.6 + rnd() * 0.7,
        flap: rnd() * Math.PI * 2,
        flapRate: 2.1 + rnd() * 1.6
      });
    }
    return out;
  })();

  /* -- Sizing -------------------------------------------------------------- */

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    var rect = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    readPalette();
    draw();
  }

  /* -- Drawing ------------------------------------------------------------- */

  function horizonY() {
    /* The horizon lifts slightly as the hero scrolls away — a subtle
       camera tilt that makes the scroll feel like movement through space. */
    return H * (0.60 - scrollNorm * 0.05 + pointer.y * 0.012);
  }

  function drawSky() {
    var hz = horizonY();
    var g = ctx.createLinearGradient(0, 0, 0, hz);
    g.addColorStop(0, P['sky-top']);
    g.addColorStop(0.58, P['sky-mid']);
    g.addColorStop(1, P['sky-low']);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, hz + 1);
  }

  function drawSun() {
    var hz = horizonY();
    var cx = W * (0.74 + pointer.x * 0.014);
    var cy = hz - H * (0.17 + scrollNorm * 0.05) + Math.sin(t * 0.16) * 3;
    var r = Math.max(26, Math.min(W, H) * 0.052);

    var glow = ctx.createRadialGradient(cx, cy, r * 0.35, cx, cy, r * 7.5);
    glow.addColorStop(0, withAlpha(P['sun'], 0.4));
    glow.addColorStop(0.42, withAlpha(P['sun'], 0.1));
    glow.addColorStop(1, withAlpha(P['sun'], 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, hz + 1);

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(P['sun'], 0.92);
    ctx.fill();

    return { x: cx, y: cy, r: r };
  }

  function drawClouds() {
    var hz = horizonY();
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, hz);
    ctx.clip();

    for (var i = 0; i < CLOUDS.length; i++) {
      var c = CLOUDS[i];
      var drift = (c.x + t * c.speed) % 1.4 - 0.2;
      var x = drift * W + pointer.x * W * 0.02 * c.depth;
      var y = c.y * H - scrollNorm * H * 0.08 * c.depth + Math.sin(t * 0.2 + i) * 2;
      var w = c.w * W;
      var h = c.h * H;

      /* A stratus band built from overlapping radial puffs. A single ellipse
         with a linear gradient leaves a hard edge at its rim; radial stops
         fade to nothing in every direction, so the band dissolves into the
         sky the way real high cloud does. */
      for (var k = 0; k < 5; k++) {
        var kf = (k / 4) - 0.5;                       // -0.5 .. 0.5
        var pw = w * (0.62 - Math.abs(kf) * 0.34);
        var ph = h * (1 - Math.abs(kf) * 0.42);
        var pxx = x + kf * w * 1.25;
        var pyy = y + Math.sin(kf * 3 + i) * h * 0.4;
        if (pw <= 0 || ph <= 0) continue;

        var g = ctx.createRadialGradient(pxx, pyy, 0, pxx, pyy, pw);
        g.addColorStop(0, withAlpha('#ffffff', c.alpha));
        g.addColorStop(0.55, withAlpha('#ffffff', c.alpha * 0.45));
        g.addColorStop(1, withAlpha('#ffffff', 0));

        ctx.save();
        ctx.translate(pxx, pyy);
        ctx.scale(1, ph / pw);                        // squash into a band
        ctx.translate(-pxx, -pyy);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(pxx, pyy, pw, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  }

  function drawSea(sun) {
    var hz = horizonY();
    var g = ctx.createLinearGradient(0, hz, 0, H);
    g.addColorStop(0, P['sea-far']);
    g.addColorStop(1, P['sea-near']);
    ctx.fillStyle = g;
    ctx.fillRect(0, hz, W, H - hz + 1);

    /* Sun glitter path on the water, narrowing toward the horizon. */
    if (sun) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, hz, W, H - hz);
      ctx.clip();

      var col = withAlpha(P['sun'], 0.5);
      var rows = 26;
      for (var i = 0; i < rows; i++) {
        var p = i / rows;
        var y = hz + p * (H - hz);
        var spread = sun.r * (0.5 + p * 7.5);
        var wob = Math.sin(t * 1.5 + i * 0.55) * spread * 0.16;
        var len = sun.r * (0.28 + p * 1.5) * (0.55 + 0.45 * Math.sin(t * 2.1 + i * 1.3));
        var a = (1 - p) * 0.5;

        ctx.globalAlpha = a;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.ellipse(sun.x + wob, y, len, Math.max(0.6, 1.1 + p * 2), 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  /* An island layer: a low silhouette sitting on the horizon, with its
     reflection smeared into the water below. The shape is filled down past
     the waterline and the sea is painted over it afterwards, which is what
     makes the land read as sitting *in* the water. */
  /* Shared geometry for a layer, so the silhouette and its reflection stay
     locked together as the layer drifts. */
  function layerGeom(L, index) {
    return {
      base: horizonY() - H * L.lift
            - scrollNorm * H * 0.05 * L.depth
            + pointer.y * 4 * L.depth,
      peak: H * L.h,
      offset: t * L.speed + pointer.x * 0.010 * L.depth,
      /* Zoom the sampled window per layer so the near ridges are not
         obviously the same coastline as the far ones. */
      zoom: 0.42 + index * 0.2
    };
  }

  function drawIslands(L, index) {
    var G = layerGeom(L, index);
    var step = 3;
    var n = Math.ceil(W / step) + 1;
    var skirt = H * 0.05;               // fill past the waterline; sea covers it

    ctx.save();
    ctx.globalAlpha = L.alpha;
    ctx.beginPath();
    ctx.moveTo(0, G.base + skirt);
    for (var i = 0; i <= n; i++) {
      var px = i * step;
      ctx.lineTo(px, G.base - ridgeAt(L, px / W * G.zoom + G.offset) * G.peak);
    }
    ctx.lineTo(W, G.base + skirt);
    ctx.closePath();

    var g = ctx.createLinearGradient(0, G.base - G.peak, 0, G.base + skirt);
    g.addColorStop(0, lighten(P[L.key], 0.18));
    g.addColorStop(1, P[L.key]);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }

  /* Mirrored, squashed, rippled and very faint. Runs after the sea, or the
     opaque water would paint straight over it. */
  function drawReflection(L, index) {
    var G = layerGeom(L, index);
    var step = 4;
    var n = Math.ceil(W / step) + 1;

    ctx.save();
    ctx.globalAlpha = L.alpha * 0.2;
    ctx.beginPath();
    ctx.moveTo(0, G.base);
    for (var i = 0; i <= n; i++) {
      var px = i * step;
      var h = ridgeAt(L, px / W * G.zoom + G.offset) * G.peak;
      var ripple = Math.sin(t * 1.7 + px * 0.04) * 1.8;
      ctx.lineTo(px + ripple, G.base + h * 0.62);
    }
    ctx.lineTo(W, G.base);
    ctx.closePath();
    ctx.fillStyle = P[L.key];
    ctx.fill();
    ctx.restore();
  }

  /* The near shore: a dune bank across the bottom of the frame, in front of
     the water. This one does fill to the bottom edge — it is the ground. */
  function drawDune() {
    var base = H * (0.94 + scrollNorm * 0.04) + pointer.y * 5;
    var peak = H * DUNE.h;
    var offset = t * DUNE.speed + pointer.x * 0.02;
    var step = 4;
    var n = Math.ceil(W / step) + 1;

    ctx.beginPath();
    ctx.moveTo(0, H);
    for (var i = 0; i <= n; i++) {
      var px = i * step;
      ctx.lineTo(px, base - ridgeAt(DUNE, px / W * 0.8 + offset) * peak);
    }
    ctx.lineTo(W, H);
    ctx.closePath();

    var g = ctx.createLinearGradient(0, base - peak, 0, H);
    g.addColorStop(0, lighten(P['isle-fore'], 0.1));
    g.addColorStop(1, P['isle-fore']);
    ctx.fillStyle = g;
    ctx.fill();
  }

  function drawSailboat() {
    var hz = horizonY();
    /* One slow crossing every ~90s, right to left. */
    var cycle = 92;
    var p = ((t % cycle) / cycle);
    var x = W * (1.12 - p * 1.28);
    var y = hz + H * 0.045 + Math.sin(t * 0.9) * 1.6;
    var s = Math.max(10, Math.min(W, H) * 0.022);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(t * 0.75) * 0.035);
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = P['isle-fore'];

    // hull
    ctx.beginPath();
    ctx.moveTo(-s * 0.85, 0);
    ctx.quadraticCurveTo(0, s * 0.5, s * 0.85, 0);
    ctx.closePath();
    ctx.fill();

    // mainsail
    ctx.beginPath();
    ctx.moveTo(-s * 0.08, -s * 1.9);
    ctx.lineTo(-s * 0.08, -s * 0.06);
    ctx.lineTo(-s * 0.78, -s * 0.06);
    ctx.closePath();
    ctx.fill();

    // jib
    ctx.beginPath();
    ctx.moveTo(s * 0.06, -s * 1.72);
    ctx.lineTo(s * 0.06, -s * 0.06);
    ctx.lineTo(s * 0.72, -s * 0.06);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawGulls() {
    ctx.save();
    ctx.strokeStyle = withAlpha(P['isle-fore'], 0.62);
    ctx.lineCap = 'round';

    for (var i = 0; i < GULLS.length; i++) {
      var b = GULLS[i];
      var x = ((b.x + t * b.speed) % 1.25 - 0.12) * W;
      var y = b.y * H - scrollNorm * H * 0.14 + Math.sin(t * 0.55 + i * 2) * H * 0.012;
      var s = 12 * b.scale;
      var flap = Math.sin(t * b.flapRate + b.flap);
      var lift = flap * s * 0.5;

      ctx.lineWidth = Math.max(1.2, s * 0.14);
      ctx.beginPath();
      ctx.moveTo(x - s, y + lift * 0.35);
      ctx.quadraticCurveTo(x - s * 0.45, y - lift, x, y);
      ctx.quadraticCurveTo(x + s * 0.45, y - lift, x + s, y + lift * 0.35);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* Atmospheric haze at the horizon line — glues sky and sea together and
     hides the hard seam where the gradients meet. */
  function drawHaze() {
    var hz = horizonY();
    var band = H * 0.09;
    var g = ctx.createLinearGradient(0, hz - band, 0, hz + band);
    g.addColorStop(0, withAlpha(P['sky-low'], 0));
    g.addColorStop(0.5, withAlpha(P['sky-low'], 0.42));
    g.addColorStop(1, withAlpha(P['sky-low'], 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, hz - band, W, band * 2);
  }

  /* Composition order is the whole trick. The three island layers are laid
     down first, each overhanging the waterline; the sea is then painted on
     top of them, which cuts them off at the horizon and leaves open water in
     front. The dune goes last, in front of everything. */
  function draw() {
    if (!W || !H) return;

    drawSky();
    var sun = drawSun();
    drawClouds();
    drawHaze();

    drawIslands(LAYERS[0], 0);
    drawIslands(LAYERS[1], 1);
    drawIslands(LAYERS[2], 2);

    drawSea(sun);

    drawReflection(LAYERS[1], 1);
    drawReflection(LAYERS[2], 2);

    drawSailboat();
    drawGulls();
    drawDune();
  }

  /* -- Colour helpers ------------------------------------------------------ */

  function parseHex(hex) {
    var h = hex.replace('#', '').trim();
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    if (isNaN(n)) return { r: 128, g: 128, b: 128 };
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function withAlpha(hex, a) {
    var c = parseHex(hex);
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
  }

  function lighten(hex, amt) {
    var c = parseHex(hex);
    return 'rgb(' +
      Math.round(c.r + (255 - c.r) * amt) + ',' +
      Math.round(c.g + (255 - c.g) * amt) + ',' +
      Math.round(c.b + (255 - c.b) * amt) + ')';
  }

  /* -- Loop ---------------------------------------------------------------- */

  function frame(stamp) {
    if (!running) return;
    var dt = lastStamp ? Math.min((stamp - lastStamp) / 1000, 0.05) : 0.016;
    lastStamp = stamp;
    t += dt;

    /* Ease the pointer so the parallax glides rather than snaps. */
    pointer.x += (target.x - pointer.x) * Math.min(1, dt * 3.2);
    pointer.y += (target.y - pointer.y) * Math.min(1, dt * 3.2);

    draw();
    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (running || reduce.matches) return;
    running = true;
    lastStamp = 0;
    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  /* -- Wiring -------------------------------------------------------------- */

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  }, { passive: true });

  window.addEventListener('scroll', function () {
    var hero = document.getElementById('hero');
    var span = hero ? hero.offsetHeight : window.innerHeight;
    scrollNorm = Math.max(0, Math.min(1, window.scrollY / Math.max(1, span)));
    if (reduce.matches) draw();
  }, { passive: true });

  window.addEventListener('pointermove', function (e) {
    target.x = (e.clientX / window.innerWidth) * 2 - 1;
    target.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  /* Pause when the hero is off-screen or the tab is hidden — no reason to
     burn a phone battery animating a scene nobody is looking at. */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });

  var hero = document.getElementById('hero');
  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) start(); else stop();
      });
    }, { threshold: 0 }).observe(hero);
  }

  /* Re-read the palette when the theme flips. */
  window.addEventListener('themechange', function () {
    readPalette();
    draw();
  });
  if (window.matchMedia) {
    var dm = window.matchMedia('(prefers-color-scheme: dark)');
    var onScheme = function () { readPalette(); draw(); };
    if (dm.addEventListener) dm.addEventListener('change', onScheme);
    else if (dm.addListener) dm.addListener(onScheme);
  }

  if (reduce.addEventListener) {
    reduce.addEventListener('change', function () {
      if (reduce.matches) { stop(); draw(); } else start();
    });
  }

  resize();
  if (reduce.matches) draw(); else start();
})();
