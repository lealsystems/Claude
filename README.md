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

## The noticeboard: announcements, social feeds, highlights

The `#news` section holds three independent pieces. Each works on its own, so
one being unconfigured never blanks the others.

### Announcements — edit one file, no code

`site/content/announcements.json`. Add an entry, save, done. The page sorts
newest-first, floats anything with `"pinned": true` to the top, and hides an
entry once its optional `"expires"` date has passed. Field-by-field notes are
inside the file itself.

This block is deliberately styled for reading rather than for looks — a real
reading measure, body type a step larger than the rest of the page, and no
animation on the text.

Everything from the JSON is inserted as text, never as markup, and links are
restricted to same-page anchors plus `http(s)`, `mailto:` and `tel:` — so no
amount of stray punctuation in a notice can turn into live HTML.

### Facebook feed — works today, free

The official Facebook Page Plugin. No API key, no token, no expiry. Point
`data-fb-page` on the Facebook panel in `index.html` at the real Page URL and
it renders that Page's recent posts.

It shows **Facebook posts only**. There is no Facebook widget that displays
Instagram posts — they are separate products. That is why there are two
panels here rather than one.

### Instagram feed — needs a decision before it shows anything

Instagram shut down the free Basic Display API on **4 December 2024**, which
is what nearly every "free Instagram feed embed" tutorial still describes.
There is no zero-cost official replacement. Two real options:

**A hosted widget** — Behold, LightWidget, SnapWidget, Elfsight or
EmbedSocial. They hold the token and refresh it. Usually a few dollars a
month, and it is a five-minute job: set two attributes on the Instagram panel
in `index.html`.

```html
data-ig-provider="behold"  data-ig-id="your-feed-id"
```

Adapters for all five are already written in `site/assets/js/social.js`.

**Your own Graph API proxy** — needs an Instagram Professional account linked
to a Facebook Page, a Meta app, and a long-lived token refreshed every 60
days. The token cannot live in the page, so it needs a small serverless
function. Then set `data-ig-provider="custom"` and
`data-ig-endpoint="/api/instagram"`; the endpoint should return
`{ "items": [ { "image": "...", "permalink": "...", "caption": "..." } ] }`.

Until one of those is configured, the panel explains itself on screen rather
than sitting there empty.

### Why the feeds ask before loading

Both embeds pull third-party scripts that set cookies and profile the
visitor. Loading them on every page view would throw away this site's
"nothing leaves our origin" property, add roughly 200KB before anyone asked
to see a feed, and create a GDPR problem for a business serving visitors from
anywhere.

So each panel shows a small card and loads the real embed only on click. The
visitor's choice is remembered on their device. If a load fails — an ad
blocker, a flaky connection — the panel puts the button back and offers a
retry rather than dying silently.

If the client would rather accept the trade and have the feeds load
immediately, add `data-autoload="true"` to a panel.

### Highlights slideshow — local images by necessity

Instagram Story Highlights are exposed by **no** Instagram API — not the
Graph API, and not the paid widget services either; they can only reach
regular feed posts. So the slideshow runs on images saved out of Instagram.

Drop them in `site/assets/img/highlights/`, run `tools/convert_images.py` to
generate the AVIF and WebP versions, and list them in
`site/content/highlights.json`.

That constraint turns out well: no token to expire, no rate limit, no consent
gate, and the images are served from our own origin at our own sizes.

The carousel has real buttons, arrow-key support, swipe, and a live region.
Autoplay pauses on hover, on focus, when the tab is hidden and when the
section scrolls out of view — and stops for good once the visitor takes
manual control. Under `prefers-reduced-motion` it never autoplays.


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
