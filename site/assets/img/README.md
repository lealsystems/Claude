# Images

Everything in here is currently a **generated placeholder** — an abstract
coastal scene in the site palette, captioned "photo pending". They exist so the
layout reads as finished while we wait on real photography, and so no slot ever
renders as a broken image.

## Dropping in the real photos

1. Put the photos in `tools/incoming/`, named after the slot they replace
   (any of `.jpg .jpeg .png .webp .heic .tif`).
2. Run `python3 tools/convert_images.py`.
3. Commit the changed files under `site/assets/img/`.

That writes `.avif`, `.webp` and `.jpg` at the right size and crop for each
slot. The `<picture>` elements in `index.html` already point at those paths, so
**no HTML editing is needed** — the new photos just appear.

`python3 tools/convert_images.py --list` prints the same table as below.

## Slots

| Slot filename            | Where it appears              | Output size | Shape     |
| ------------------------ | ----------------------------- | ----------- | --------- |
| `deck-harbour`           | Work grid, wide tile (top)    | 1600 × 1000 | landscape |
| `outdoor-shower-cedar`   | Work grid, tall tile          | 1000 × 1250 | portrait  |
| `kitchen-coastal`        | Work grid, tall tile          | 1000 × 1250 | portrait  |
| `shingle-exterior`       | Work grid, tall tile          | 1000 × 1250 | portrait  |
| `bath-tile`              | Work grid, tall tile          | 1000 × 1250 | portrait  |
| `pergola-porch`          | Work grid, wide tile (bottom) | 1600 × 1000 | landscape |
| `team-portrait`          | About section                 | 1100 × 1375 | portrait  |
| `og-cover`               | Link previews when shared     | 1200 × 630  | landscape |

Photos are centre-cropped slightly above middle (`centering=(0.5, 0.45)`),
which suits architecture — it favours the building over the driveway. If a
particular shot crops badly, crop it by hand first and the script will leave
your framing alone as long as the aspect ratio already matches.

## Two things to update by hand

- **Alt text.** Each `<img>` in `index.html` has alt text describing the
  *placeholder's intended subject*. Once the real photo is in, rewrite the alt
  to describe that actual photo — it is what screen-reader users and search
  engines read.
- **Captions.** The `work__name` and `work__place` in each `<figcaption>` are
  plausible-but-invented project names and towns. Replace them with real
  projects before launch.

## Regenerating placeholders

`python3 tools/make_placeholders.py` rewrites every slot back to a placeholder.
Useful for a slot whose photo is not ready yet — but note it overwrites *all*
slots, so run it before dropping real photos in, not after.
