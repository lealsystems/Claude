#!/usr/bin/env python3
"""Fetch the Google Fonts the site uses and write them into one CSS file
with every woff2 inlined, so a bundled page needs no network.

Cinzel and Inter are served as variable fonts: one file per subset covers
every weight. Google still emits an @font-face per weight, all pointing at
the same file, so we collapse them into one face with a weight range and
keep the latin subset only.
"""
import base64, re, subprocess, os

CSS_URL = ("https://fonts.googleapis.com/css2"
           "?family=Cinzel:wght@400;500;600;700"
           "&family=Inter:wght@300;400;500;600&display=swap")
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")
OUT = os.path.join(os.path.dirname(__file__), "fonts-inline.css")


def get(url, binary=False):
    out = subprocess.run(["curl", "-sSL", "-A", UA, url],
                         capture_output=True, check=True).stdout
    return out if binary else out.decode("utf-8")


def main():
    css = get(CSS_URL)
    faces = {}                      # (family, url) -> block, weights, range
    for m in re.finditer(r"/\*\s*([a-z-]+)\s*\*/\s*(@font-face\s*\{[^}]*\})", css):
        subset, block = m.group(1), m.group(2)
        if subset != "latin":       # the site is English
            continue
        fam = re.search(r"font-family:\s*'([^']+)'", block).group(1)
        url = re.search(r"url\((https://[^)]+\.woff2)\)", block).group(1)
        wt = int(re.search(r"font-weight:\s*(\d+)", block).group(1))
        key = (fam, url)
        if key in faces:
            faces[key][1].append(wt)
        else:
            faces[key] = [block, [wt]]

    out = []
    for (fam, url), (block, weights) in faces.items():
        print("  %-7s %s  weights %d-%d"
              % (fam, url.rsplit("/", 1)[-1], min(weights), max(weights)))
        data = base64.b64encode(get(url, binary=True)).decode("ascii")
        block = block.replace(url, "data:font/woff2;base64," + data)
        block = re.sub(r"font-weight:\s*\d+",
                       "font-weight: %d %d" % (min(weights), max(weights)),
                       block)
        out.append(block)

    text = ("/* Cinzel + Inter, latin subset, inlined so the page carries its\n"
            "   own type and needs no font request. Rebuild: build/fonts.py */\n"
            + "\n".join(out) + "\n")
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(text)
    print("%s  %.0f KB  (%d faces)" % (OUT, len(text) / 1024, len(out)))


if __name__ == "__main__":
    main()
