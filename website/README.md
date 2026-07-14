# SA Construction — Pitch Website

A single-page, self-contained website for SA Construction Inc, modeled on
high-end builder sites like schmittcompany.com. Open `index.html` in any
browser — no build step, no dependencies, works offline.

## What's inside

- `index.html` — the whole site (HTML + CSS + a few lines of JS)
- `assets/sa-badge.svg` — vector recreation of the silver blade badge logo
- `assets/img/*.svg` — portfolio imagery

## About the imagery

The six portfolio images are **procedurally generated oak renders** (SVG wood
grain, paneling, and lighting), regenerable via the project's generator script.
They exist because this build environment's network policy blocks downloading
stock photography. They present well, but for the final pitch you'll want real
photos.

**To swap in real photography:** drop JPEG files into `assets/img/` and update
the six `<img src="assets/img/...">` references in `index.html` (hero, six
portfolio cards, three material swatches, quote band). Nothing else changes —
the layout crops images automatically (`object-fit: cover`).

Good free sources (no attribution required):
- unsplash.com — search "oak paneling", "wood panel wall", "walnut library",
  "luxury kitchen oak", "wine cellar wood"
- pexels.com — search "wooden wall panels interior", "custom cabinetry"

Ideally, replace with SA Construction's own project photos before going live.

## Notes for going live

- All copy is draft/pitch copy — have SA Construction confirm service area,
  hours, and email (the contact form currently opens a mail draft to
  `info@saconstruction.com`, a placeholder).
- Hosting: any static host (Netlify, Vercel, GitHub Pages, cPanel) — upload
  the `website/` folder as-is.
