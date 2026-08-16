# Timothy William Fenney Building & Remodeling

Single-page marketing site — West Barnstable, Cape Cod MA.
Premium decking · premium siding · skilled finish carpentry.

## Stack

Plain HTML / CSS / JS (no build step). Open `index.html` in a browser or serve the folder statically.

- `index.html` — all sections (hero, services, before/after, about, contact) accessed via the hamburger menu
- `css/style.css` — brand palette from the logo: navy `#0B3158`, slate `#25476A`, stone `#8A8A8A`, mist `#D1D8E0`, gold `#B08D57`
- `js/main.js` — menu, saw-blade cursor + scroll cut-line (counterclockwise spin on scroll), before/after slider, lead form
- `assets/` — logo (original + squared) and before/after placeholder images

## GoHighLevel form

Paste the inbound webhook URL into `GHL_CONFIG.webhookUrl` at the top of `js/main.js`
(Automations → Workflow → Inbound Webhook trigger). Until it's set, the form falls back
to a pre-filled email to twfbuilding@outlook.com. Alternatively, replace the `<form>` in
the contact section with a GHL embed iframe — the spot is marked with a comment.

## Swapping in real photos

Replace `assets/ba-mantel-before.svg` / `assets/ba-mantel-after.svg` with project photos
(keep 16:9-ish crops). To add more before/after projects, duplicate a `.ba-figure` block
in `index.html`.
