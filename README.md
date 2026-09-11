# Timothy William Fenney Building & Remodeling

Single-page marketing site — West Barnstable, Cape Cod MA.
Premium decking · premium siding · skilled finish carpentry.

## Stack

Plain HTML / CSS / JS (no build step). Open `index.html` in a browser or serve the folder statically.

- `index.html` — all sections (hero, services, selected work, before/after, about, contact) accessed via the hamburger menu
- `css/style.css` — brand palette from the logo: navy `#0B3158`, slate `#25476A`, stone `#8A8A8A`, mist `#D1D8E0`, gold `#B08D57`
- `js/main.js` — menu, saw-blade cursor + scroll cut-line (counterclockwise spin on scroll), before/after slider, selected-work slideshow, lead form
- `assets/` — logo (original + squared) and before/after placeholder images

## GoHighLevel form

Paste the inbound webhook URL into `GHL_CONFIG.webhookUrl` at the top of `js/main.js`
(Automations → Workflow → Inbound Webhook trigger). Until it's set, the form falls back
to a pre-filled email to twfbuilding@outlook.com. Alternatively, replace the `<form>` in
the contact section with a GHL embed iframe — the spot is marked with a comment.

## Selected Work slideshow

The photos come from the `SLIDESHOW` list at the top of `index.html`, just under
the `<title>`. Each entry is one slide, and the order there is the order they play:

```js
const SLIDESHOW = [
  { photo: "https://.../twf/deck-osterville.jpg" },
  { photo: "" },
];
```

`photo` takes the file's link from the GoHighLevel media library (the TWF folder)
or a path like `assets/NAME.jpg` for a photo committed to this repo. An empty
string leaves the slot as a plain plate carrying the saw-blade mark.

No wording appears over the photos. To caption one, add a title to its block —
`{ photo: "...", title: "Chimney Rebuild — Barnstable" }` — and that slide gets a
one-line caption on a navy scrim. Slides without a title carry no caption bar at all.

Only the entries listed here appear. Nothing is read from a media folder
automatically — each photo is named individually, by design.

Arrows, dots, arrow keys, and swipe all drive it. Autoplay is the `data-autoplay`
value in milliseconds on `.slideshow` — remove the attribute to hold on one slide.
It pauses on hover, on focus, on a hidden tab, and under `prefers-reduced-motion`.

## Before & After

The section carries a commented-out `.ba-figure` template. Uncomment it, point the two
`<img>` tags at a matching pair of project photos in `assets/` (same crop, same angle,
16:9-ish), and duplicate the block for each further project.
