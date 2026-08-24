#!/usr/bin/env python3
"""
Turn real photographs into the web assets the page expects.

Drop full-size photos (straight off the camera or phone is fine) into
tools/incoming/ named after the slot they belong to, then run:

    python3 tools/convert_images.py

For every photo it writes .avif, .webp and .jpg at the slot's target size and
aspect ratio, straight into site/assets/img/, replacing whatever is there. The
<picture> markup in index.html already points at those paths, so nothing in
the HTML needs editing.

    tools/incoming/deck-harbour.jpg
        -> site/assets/img/gallery/deck-harbour.{avif,webp,jpg}

Run with --list to print the slot names and the crop each one uses.
"""

import argparse
import os
import sys

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("Pillow is required:  pip install pillow")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INCOMING = os.path.join(ROOT, "tools", "incoming")
OUT = os.path.join(ROOT, "site", "assets", "img")

# slot name -> (destination path relative to site/assets/img, width, height)
SLOTS = {
    "deck-harbour":         ("gallery/deck-harbour",         1600, 1000),
    "outdoor-shower-cedar": ("gallery/outdoor-shower-cedar", 1000, 1250),
    "kitchen-coastal":      ("gallery/kitchen-coastal",      1000, 1250),
    "shingle-exterior":     ("gallery/shingle-exterior",     1000, 1250),
    "bath-tile":            ("gallery/bath-tile",            1000, 1250),
    "pergola-porch":        ("gallery/pergola-porch",        1600, 1000),
    "team-portrait":        ("team-portrait",                1100, 1375),
    "og-cover":             ("og-cover",                     1200,  630),
}

EXTS = (".jpg", ".jpeg", ".png", ".webp", ".heic", ".tif", ".tiff")


def convert(src, slot):
    rel, w, h = SLOTS[slot]
    img = Image.open(src)

    # Respect the EXIF orientation flag, or phone photos land sideways.
    img = ImageOps.exif_transpose(img)
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")

    # Centre-crop to the slot's aspect ratio, then resize down.
    img = ImageOps.fit(img, (w, h), method=Image.LANCZOS, centering=(0.5, 0.45))

    dest = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(dest), exist_ok=True)

    img.save(dest + ".jpg", quality=84, optimize=True, progressive=True)
    img.save(dest + ".webp", quality=80, method=6)
    sizes = ["jpg", "webp"]
    try:
        img.save(dest + ".avif", quality=60)
        sizes.append("avif")
    except Exception as exc:
        print("    avif skipped (%s)" % exc)

    print("  %-22s -> %s.{%s}  %dx%d"
          % (os.path.basename(src), rel, ",".join(sizes), w, h))


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--list", action="store_true",
                    help="print the slot names and exit")
    args = ap.parse_args()

    if args.list:
        print("Slot name              Output                        Size")
        print("-" * 64)
        for slot, (rel, w, h) in SLOTS.items():
            print("%-22s %-29s %dx%d" % (slot, rel, w, h))
        return

    os.makedirs(INCOMING, exist_ok=True)
    found = 0
    unknown = []

    for name in sorted(os.listdir(INCOMING)):
        stem, ext = os.path.splitext(name)
        if ext.lower() not in EXTS:
            continue
        if stem not in SLOTS:
            unknown.append(name)
            continue
        convert(os.path.join(INCOMING, name), stem)
        found += 1

    if unknown:
        print("\nSkipped — filename does not match a slot:")
        for n in unknown:
            print("  %s" % n)
        print("Run  python3 tools/convert_images.py --list  to see valid names.")

    if not found:
        print("No matching photos in %s" % INCOMING)
    else:
        print("\nConverted %d image(s)." % found)


if __name__ == "__main__":
    main()
