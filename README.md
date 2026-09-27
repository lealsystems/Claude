# Timothy William Fenney Building & Remodeling

Single-page marketing site — West Barnstable, Cape Cod MA.
Premium decking · premium siding · skilled finish carpentry.

## Stack

Plain HTML / CSS / JS (no build step). Open `index.html` in a browser or serve the folder statically.

- `index.html` — all sections (hero, services, the work, about, contact) reached through the hamburger menu, plus the `SLIDESHOW` picture list at the top
- `css/style.css` — brand palette from the logo: navy `#0B3158`, slate `#25476A`, stone `#8A8A8A`, mist `#D1D8E0`, gold `#B08D57`, on a Lancaster Whitewash `#EDE8DB` ground
- `js/main.js` — menu, saw-blade cursor + scroll cut-line (counterclockwise spin on scroll), the work carousel, lead form
- `assets/` — the hero photograph and the logo (original, knocked-out, and squared)
- `assets/work/` — Tim's job photographs, the ones the carousel plays
- `build/` — the bundler (see **Single-file build**); nothing the site itself needs

## The Work — one carousel for every picture

Finished photos and before/after comparisons share a single section, so there is
one place to add pictures. Everything comes from the `SLIDESHOW` list at the top of
`index.html`, just under the `<title>`. Each entry is one slide, and the order there
is the order they play:

```js
const SLIDESHOW = [
  { photo: "assets/work/deck-mahogany.jpg" },
  { before: "assets/work/fireplace-before.jpg",
    after:  "assets/work/fireplace-after.jpg", focus: "center 25%" },
  { photo: "" },
];
```

- **`photo`** — one finished shot. Takes the file's link from the GoHighLevel media
  library, or a path like `assets/NAME.jpg` for a photo committed to this repo.
- **`before` + `after`** — a comparison whose divider the visitor drags. Shoot the
  pair from the same spot so the two line up.
- **empty** — a plain plate carrying the saw-blade mark, holding the slot.
- **`focus`** — where a tall photo is cropped. A slide is 16:10 on a desktop and
  4:5 on a phone, so a portrait shot loses its top and bottom; `focus: "center 30%"`
  keeps the upper part instead of the middle. Left out, the middle is kept.

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

```sh
python3 build/fonts.py     # only when the typefaces change; needs the network
python3 build/build.py     # needs Pillow, to size the photos for the bundle
```

`build/build.py` folds the CSS, the JavaScript, the fonts and every picture into
single files under `dist/`:

- `fenney-standalone.html` — the whole page. Open it anywhere; it asks the network
  for nothing.
- `fenney-ghl.html` — the same thing as body content, for a GoHighLevel **Custom
  Code** element. Two blocks are appended and marked in the file: CSS that steps
  the site back out of the builder's padded column, and a script that pulls it
  flush to the top of the page.
- `fenney-netlify.zip` — the plain folder, to drag onto Netlify.

Pictures are text once inlined, about a third longer than the file on disk, so the
bundle re-encodes each one to the size the page actually paints it (`BUNDLE_SIZE`
in the script). The copies in `assets/` stay at full quality for hosting.

**To shrink the paste.** Every photo is inlined only because it lives in this repo.
Point a `SLIDESHOW` entry at its link in the GoHighLevel media library instead and
that picture drops out of the file — all thirteen together are about four fifths of it.
The page behaves the same either way.

`build/fonts-inline.css` is generated but committed, so a bundle can be built
without reaching Google Fonts.
