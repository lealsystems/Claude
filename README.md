# Cape Codder Building & Remodeling — website rebuild

A rebuild of [capecodderinc.com](https://www.capecodderinc.com) as a static
site: one page, no build step, no framework, no third-party requests at
runtime. Everything — fonts included — is served from our own origin.

```
site/                        ← this whole folder is the deployable site
  index.html
  assets/
    css/    fonts.css  base.css  layout.css  animations.css
    js/     islands.js  type.js  main.js
    fonts/  self-hosted Fraunces + Inter variable woff2
    img/    gallery photos and placeholders  (see assets/img/README.md)
    icons/  favicon, touch icons
  robots.txt  sitemap.xml  site.webmanifest  CNAME  _redirects
tools/
  make_placeholders.py       regenerate stand-in imagery
  convert_images.py          turn real photos into web assets
netlify.toml  vercel.json    deploy + redirect + header config
```

## Running it locally

No install, no build:

```sh
cd site
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Open it over `http://`, not by
double-clicking the file — `file://` blocks the font loads and the module
paths.

---

## The two things that make it feel alive

### Animated islands

`assets/js/islands.js` draws the whole seascape behind the hero on one
`<canvas>`: sky, sun, drifting stratus, three layers of low island silhouettes
with reflections, sun-glitter on the water, a sailboat that crosses every
ninety seconds, gulls, and a foreground dune.

The coastlines are generated from summed sine octaves off a fixed seed, so the
shoreline is identical on every load — a coastline that reshuffles on refresh
reads as a bug. Each layer drifts at its own speed and responds to scroll and
pointer position, which is what produces the depth.

It reads its colours from the CSS custom properties in `base.css`, so it
re-themes along with the rest of the page instead of carrying its own palette.
It pauses when the hero scrolls out of view or the tab is hidden, and renders a
single static frame for anyone who prefers reduced motion.

To retune the scene, the interesting knobs are the `LAYERS` array (island
height, drift speed, how much open water sits between land masses) and the
`--sky-*` / `--sea-*` / `--isle-*` tokens in `base.css`.

### Animated fonts

Both faces are variable fonts, self-hosted. Fraunces carries four axes —
`opsz` 9–144, `wght` 100–900, `SOFT` 0–100 and `WONK` 0–1 — and
`assets/js/type.js` interpolates those axes directly rather than just fading
text in. Headline characters arrive small-optical-size, light, maximally soft
and wonky, and physically resolve into large-optical-size, bold, crisp
letterforms.

| Attribute            | What it does                                            |
| -------------------- | ------------------------------------------------------- |
| `data-type-reveal`   | Per-character arrival, staggered. Used on the hero H1.   |
| `data-type-settle`   | Whole-heading axis settle. Used on section titles.       |
| `data-type-breathe`  | Slow continuous `SOFT` swell. Used on the wordmark.      |

Tune a single instance with `data-type-stagger`, `data-type-duration` and
`data-type-delay` (all milliseconds).

---

## Robustness

Three failure modes are handled deliberately, because each one otherwise
produces a blank page rather than a degraded one:

- **No JavaScript.** `<html>` ships with `class="no-js"`, swapped to `js` by an
  inline script before first paint. Every rule that starts an element at
  `opacity: 0` is scoped to `.js`, so with scripting off the page renders as
  plain, complete, visible content.
- **Reduced motion.** The canvas paints one static frame, and all reveals
  resolve immediately to their finished state.
- **Missed reveals.** The scroll observers also fire for elements that have
  already passed above the viewport, and a debounced sweep catches anything
  left behind. A fast flick or an anchor jump can move an element from below
  the fold to above it between two animation frames, and an
  `isIntersecting`-only check would strand that content invisible.

One related trap worth knowing about, since it is easy to reintroduce: the
image reveal is a **retracting curtain**, not a `clip-path` on the frame. A
fully clipped element has no visible area, so Chromium's lazy-loader never
fetches images inside it — scrolling briskly past the gallery left every frame
permanently empty. The curtain covers the image without hiding it, so
`loading="lazy"` behaves normally.

---

## Photos

The gallery currently shows generated placeholders. To put the real photos in:

1. Drop them in `tools/incoming/`, named after the slot they fill.
2. Run `python3 tools/convert_images.py` (needs `pip install pillow`).
3. Commit what changes under `site/assets/img/`.

That writes `.avif`, `.webp` and `.jpg` at the right size and crop for each
slot; the `<picture>` markup already points at those paths, so no HTML editing
is needed. `python3 tools/convert_images.py --list` prints the slot names.
Full detail, including which alt text and captions still need rewriting, is in
[`site/assets/img/README.md`](site/assets/img/README.md).

---

## Deploying and pointing the domain at it

The site is static, so any host works. Config for the two most likely is
committed: `netlify.toml` and `vercel.json`. Both set `site/` as the publish
directory, redirect the apex to `www`, and add security and cache headers —
fonts `immutable` for a year, HTML always revalidated.

**Netlify**

1. New site → connect this repo → branch `claude/cape-codder-rebuild-ubolv5`.
   Publish directory and headers come from `netlify.toml`; leave the build
   command empty.
2. Deploy and check the generated `*.netlify.app` URL first.
3. Domain management → add `www.capecodderinc.com` and `capecodderinc.com`.
4. At the current DNS provider, point `www` at the host Netlify gives you and
   the apex at their ALIAS/ANAME target (or use Netlify DNS and change the
   nameservers).
5. Enable HTTPS once DNS resolves, then turn on **Force HTTPS**.

**Vercel** — same shape: import the repo, `vercel.json` supplies the rest, then
add both hostnames under Project → Domains.

### Before you flip DNS

The domain currently serves the live site, so cutting over replaces a working
site with this one. Worth doing first:

- Deploy to the preview URL and click through it on a real phone.
- Confirm the real contact details are in (see below) — a live site with a
  placeholder phone number is worse than the old site.
- Note the current DNS records somewhere before changing them, so the change
  is reversible.
- Keep TTL low (300s) for the cutover, raise it afterwards.

`www` is canonical: `index.html`'s `<link rel="canonical">`, the `CNAME` file,
the sitemap and both redirect configs all agree on that. If you'd rather serve
the apex, change all five together or search engines will see a redirect loop.

---

## Content still to confirm with the client

Everything below is a placeholder or an inference from public sources, and
should be checked before launch. They are marked with comments in
`index.html` too.

| Item | Status |
| --- | --- |
| Phone `(508) 555-0100` | **Placeholder.** 555-01xx is a reserved fictional range. Must be replaced. |
| Email `info@capecodderinc.com` | **Guessed** from the domain. Confirm it exists. |
| Testimonials | **Placeholder text.** Needs real, attributable reviews. |
| Project names and towns in the gallery | **Invented.** Plausible but not real projects. |
| "10+ years", "Est. 2022", "certified general contractor" | From public listings for the business — confirm the exact wording, and the licence number if they want it shown. |
| Street address | Omitted. The JSON-LD has region only; add the full address if they operate from a listed premises. |
| Service list | Decks, outdoor showers, exterior renovations, kitchens, baths, exterior cleaning — from public listings. Confirm nothing is missing. |

### Wiring up the form

As written the form posts to **Netlify Forms** (the `data-netlify` attribute
plus the hidden `form-name` field), which needs no backend — submissions appear
in the Netlify dashboard, and you set up email notifications there.

For anything else, change the form's `action` to your endpoint and drop the two
Netlify attributes; `main.js` posts a `FormData` body and expects a 2xx. It
already handles client-side validation, a honeypot, the sending state and
success and failure messages. With JavaScript off the form still submits
natively.
