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

Slides live in `index.html` under `#gallery`. To add a photo, drop it in `assets/`
and copy one `<li class="slide">` block — markup order is play order:

```html
<li class="slide" data-slide>
  <figure class="slide-figure">
    <img class="slide-img" src="assets/NAME.jpg" alt="Short description">
    <figcaption class="slide-cap">
      <strong>Project — Town, MA</strong>
      <span>One or two lines about the work.</span>
    </figcaption>
  </figure>
</li>
```

Services still waiting on photography use a stand-in plate instead of an `<img>`
(`<figure class="slide-figure is-plate">`) — delete those blocks as real photos arrive.
The first slide reuses the hero photograph through the `--photo-chimney` CSS token so a
bundled single-file build only carries that image once.

Arrows, dots, arrow keys, and swipe all drive it. Autoplay is the `data-autoplay`
value in milliseconds on `.slideshow` — remove the attribute to hold on one slide.
It pauses on hover, on focus, on a hidden tab, and under `prefers-reduced-motion`.

## Before & After

The section carries a commented-out `.ba-figure` template. Uncomment it, point the two
`<img>` tags at a matching pair of project photos in `assets/` (same crop, same angle,
16:9-ish), and duplicate the block for each further project.
