#!/usr/bin/env python3
"""
Generate stand-in imagery for the gallery and portrait slots.

These are deliberately abstract coastal scenes in the site palette, not grey
"image missing" boxes: the layout reads as finished while we wait on the real
photography, and nothing looks broken if a slot is still empty at launch.

Each slot is written as .avif, .webp and .jpg so the <picture> elements in
index.html resolve in every browser. Dropping a real photo in at the same
path and re-running tools/convert_images.py replaces them.

    python3 tools/make_placeholders.py
"""

import math
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, "site", "assets", "img")

# Palette, matching the light-theme tokens in assets/css/base.css
SKY_TOP = (191, 224, 234)
SKY_MID = (232, 220, 198)
SKY_LOW = (246, 217, 174)
SUN = (255, 207, 135)
SEA_FAR = (111, 162, 180)
SEA_NEAR = (46, 96, 118)
RIDGES = [(143, 177, 189), (77, 127, 143), (34, 80, 95), (18, 48, 60)]
INK = (12, 29, 38)


def lerp(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def seeded(seed):
    s = seed & 0xFFFFFFFF

    def nxt():
        nonlocal s
        s = (s * 1664525 + 1013904223) & 0xFFFFFFFF
        return s / 4294967296

    return nxt


def ridge_profile(width, seed, freq, points=220):
    """Summed sine octaves -> a rolling coastline, same idea as islands.js."""
    rnd = seeded(seed)
    octaves = [
        (freq * (1 + i * 1.9), 1 / (1.85 ** i), rnd() * math.tau)
        for i in range(4)
    ]
    out = []
    for x in range(width):
        u = x / max(1, width - 1)
        v = sum(math.sin(u * math.tau * f + p) * a for f, a, p in octaves)
        v = max(0.0, (v + 1.6) / 3.2)
        out.append(v)
    top = max(out) or 1.0
    return [v / top for v in out]


def make_scene(w, h, seed, label=None):
    img = Image.new("RGB", (w, h), SKY_TOP)
    px = img.load()
    horizon = int(h * 0.58)

    # Sky
    for y in range(horizon):
        t = y / max(1, horizon)
        col = lerp(SKY_TOP, SKY_MID, min(1, t * 1.7)) if t < 0.58 \
            else lerp(SKY_MID, SKY_LOW, (t - 0.58) / 0.42)
        for x in range(w):
            px[x, y] = col

    # Sea
    for y in range(horizon, h):
        t = (y - horizon) / max(1, h - horizon)
        col = lerp(SEA_FAR, SEA_NEAR, t)
        for x in range(w):
            px[x, y] = col

    d = ImageDraw.Draw(img, "RGBA")

    # Sun
    rnd = seeded(seed * 7 + 3)
    sx, sy = int(w * (0.55 + rnd() * 0.3)), int(horizon - h * 0.2)
    r = int(min(w, h) * 0.055)
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse(
        [sx - r * 5, sy - r * 5, sx + r * 5, sy + r * 5], fill=SUN + (46,))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=max(6, r)))
    img = Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB")
    d = ImageDraw.Draw(img, "RGBA")
    d.ellipse([sx - r, sy - r, sx + r, sy + r], fill=SUN + (235,))

    # Water shimmer — laid down before the ridges so the land masses sit on
    # top of it rather than the glitter appearing to float over the hills
    for i in range(34):
        y = horizon + int((h - horizon) * (i / 34) ** 1.35)
        wob = math.sin(i * 0.8) * w * 0.05
        length = w * (0.02 + (i / 34) * 0.14)
        alpha = int(70 * (1 - i / 34))
        d.line([(sx + wob - length, y), (sx + wob + length, y)],
               fill=SUN + (alpha,), width=max(1, int(h * 0.004)))

    # Island ridges, far to near
    for i, colour in enumerate(RIDGES):
        prof = ridge_profile(w, seed * 31 + i * 97, 1.3 + i * 0.6)
        base = int(h * (0.60 + i * 0.055))
        peak = h * (0.07 + i * 0.018)
        pts = [(x, base - prof[x] * peak) for x in range(w)]
        d.polygon(pts + [(w, h), (0, h)], fill=colour + (232 if i else 190,))

    img = img.filter(ImageFilter.GaussianBlur(radius=max(0.6, min(w, h) / 900)))

    # Caption plate, so it is obvious these are stand-ins
    if label:
        d = ImageDraw.Draw(img, "RGBA")
        try:
            font = ImageFont.truetype(
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                max(13, int(h * 0.032)))
        except OSError:
            font = ImageFont.load_default()

        box = d.textbbox((0, 0), label, font=font)
        tw, th = box[2] - box[0], box[3] - box[1]
        pad = int(h * 0.022)
        x0 = int(w * 0.06)
        y0 = int(h - h * 0.06 - th - pad * 2)
        d.rounded_rectangle(
            [x0, y0, x0 + tw + pad * 2, y0 + th + pad * 2],
            radius=pad, fill=(255, 255, 255, 210))
        d.text((x0 + pad, y0 + pad - box[1]), label, font=font, fill=INK)

    return img


def write(img, rel):
    path = os.path.join(IMG, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    stem = os.path.splitext(path)[0]
    img.save(stem + ".jpg", quality=82, optimize=True, progressive=True)
    img.save(stem + ".webp", quality=78, method=6)
    try:
        img.save(stem + ".avif", quality=62)
    except Exception as exc:                      # AVIF plugin absent
        print("  (avif skipped: %s)" % exc)
    print("  %s .jpg/.webp/.avif" % rel)


SLOTS = [
    ("gallery/deck-harbour.jpg",         1200, 750,  11, "Deck — photo pending"),
    ("gallery/outdoor-shower-cedar.jpg",  800, 1000, 23, "Outdoor shower — photo pending"),
    ("gallery/kitchen-coastal.jpg",       800, 1000, 37, "Kitchen — photo pending"),
    ("gallery/shingle-exterior.jpg",      800, 1000, 51, "Exterior — photo pending"),
    ("gallery/bath-tile.jpg",             800, 1000, 67, "Bathroom — photo pending"),
    ("gallery/pergola-porch.jpg",        1200, 750,  83, "Porch — photo pending"),
    ("team-portrait.jpg",                 900, 1125, 97, "Team portrait — photo pending"),
    ("og-cover.jpg",                     1200, 630,  13, None),
]


def main():
    print("Writing placeholders to %s" % IMG)
    for rel, w, h, seed, label in SLOTS:
        write(make_scene(w, h, seed, label), rel)
    print("Done.")


if __name__ == "__main__":
    main()
