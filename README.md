# Timothy William Fenney Building & Remodeling

Single-page marketing site — West Barnstable, Cape Cod MA.
Premium decking · premium siding · skilled finish carpentry.

## Stack

Plain HTML / CSS / JS (no build step). Open `index.html` in a browser or serve the folder statically.

- `index.html` — all sections (hero, services, the work, about, contact) reached through the hamburger menu, plus the `SLIDESHOW` picture list at the top
- `css/style.css` — brand palette from the logo: navy `#0B3158`, slate `#25476A`, stone `#8A8A8A`, mist `#D1D8E0`, gold `#B08D57`, on a Lancaster Whitewash `#EDE8DB` ground
- `js/main.js` — menu, saw-blade cursor + scroll cut-line (counterclockwise spin on scroll), the work carousel, lead form
- `assets/` — the hero photograph and the logo (original, knocked-out, and squared)

## The Work — one carousel for every picture

Finished photos and before/after comparisons share a single section, so there is
one place to add pictures. Everything comes from the `SLIDESHOW` list at the top of
`index.html`, just under the `<title>`. Each entry is one slide, and the order there
is the order they play:

```js
const SLIDESHOW = [
  { photo: "https://.../twf/deck-osterville.jpg" },
  { before: "https://.../twf/mantel-before.jpg",
    after:  "https://.../twf/mantel-after.jpg" },
  { photo: "" },
];
```

- **`photo`** — one finished shot. Takes the file's link from the GoHighLevel media
  library, or a path like `assets/NAME.jpg` for a photo committed to this repo.
- **`before` + `after`** — a comparison whose divider the visitor drags. Shoot the
  pair from the same spot so the two line up.
- **empty** — a plain plate carrying the saw-blade mark, holding the slot.

No wording appears over the pictures. To caption one, add a title to its entry —
`{ photo: "...", title: "Chimney Rebuild — Barnstable" }` — and that slide gets a
one-line caption on a navy scrim. Slides without a title carry no caption bar at all.

Only the entries listed here appear. Nothing is read from a media folder
automatically — each picture is named individually, by design.

Arrows, dots, arrow keys, and swipe move between slides. On a comparison, the
horizontal drag and the arrow keys drive its divider instead, so the two gestures
never fight. Autoplay is the `data-autoplay` value in milliseconds on `.slideshow` —
remove the attribute to hold on one slide. It pauses on hover, on focus, mid-drag,
on a hidden tab, and under `prefers-reduced-motion`.

## GoHighLevel form

Paste the inbound webhook URL into `GHL_CONFIG.webhookUrl` at the top of `js/main.js`
(Automations → Workflow → Inbound Webhook trigger). Until it's set, the form falls back
to a pre-filled email to twfbuildremodel@gmail.com. Alternatively, replace the `<form>` in
the contact section with a GHL embed iframe — the spot is marked with a comment.

## Millwork

Three pieces of trim mark where one section becomes the next: a crown molding
where the page steps into the navy About section, a wainscot dado along the foot
of the contact form, and a course of brick above The Work matching the band under
the hero. All three are gradients — no image files, no weight — and all three are
scaled by `--trim-ink` in `:root`. Set that to `0` and every piece disappears
without touching another line. The dado is dropped under 700px, where vertical
room is scarce.

## Single-file build

`index.html`, `css/`, `js/`, and `assets/` can be bundled into one self-contained HTML
file — fonts and images inlined, zero external requests — for pasting into a hosted code
editor. Point the `SLIDESHOW` entries at hosted image URLs rather than local paths to
keep that file small.
