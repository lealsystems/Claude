#!/usr/bin/env python3
"""Bundle the site into single self-contained files.

  dist/fenney-standalone.html  a whole page: open it anywhere, no server
  dist/fenney-ghl.html         a body fragment for a GoHighLevel
                               Custom Code element
  dist/fenney-netlify.zip      the plain folder, ready to drag onto Netlify

Everything the page needs — CSS, JS, fonts, photos — is inlined, so there
is nothing to upload alongside it and nothing to break later.
"""
import base64, io, mimetypes, os, re, zipfile

try:
    from PIL import Image
except ImportError:                     # bundling still works, just heavier
    Image = None

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "dist")
BUILD = os.path.join(ROOT, "build")


def read(*parts):
    with open(os.path.join(ROOT, *parts), encoding="utf-8") as f:
        return f.read()


# A bundled page carries its pictures as text, which roughly a third again
# as long as the file itself. The repository keeps full-quality photos for
# hosting; the bundle gets copies sized to what the page actually paints.
BUNDLE_SIZE = {"assets/hero-chimney.jpg": (1600, 68)}
BUNDLE_DEFAULT = (1100, 68)             # the widest a slide is ever painted


def encoded(relpath):
    """The bytes to inline, re-encoded for the bundle where that pays."""
    path = os.path.join(ROOT, relpath)
    raw = open(path, "rb").read()
    if Image is None or not relpath.lower().endswith((".jpg", ".jpeg")):
        return raw
    width, quality = BUNDLE_SIZE.get(relpath, BUNDLE_DEFAULT)
    im = Image.open(io.BytesIO(raw)).convert("RGB")
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=quality, optimize=True, progressive=True)
    return buf.getvalue() if len(buf.getvalue()) < len(raw) else raw


def data_uri(relpath):
    mime = mimetypes.guess_type(relpath)[0] or "application/octet-stream"
    return "data:%s;base64,%s" % (mime, base64.b64encode(encoded(relpath)).decode())


def inline_assets(text, prefixes=("assets/", "../assets/")):
    """Swap every assets/... reference for a data URI, encoding each file once."""
    cache, used = {}, []

    def sub(m):
        quote, ref = m.group(1), m.group(2)
        rel = ref.replace("../", "")
        if rel not in cache:
            cache[rel] = data_uri(rel)
            used.append(rel)
        return quote + cache[rel]

    pattern = r'(["\(])(?:\.\./)?(assets/[A-Za-z0-9._/-]+)'
    text = re.sub(pattern, sub, text)
    return text, used


def bundle():
    html = read("index.html")
    css = read("css", "style.css")
    js = read("js", "main.js")
    fonts = read("build", "fonts-inline.css")

    # fonts come from disk, not from Google
    html = re.sub(r'\s*<link rel="preconnect"[^>]*>', "", html)
    html = re.sub(r'\s*<link href="https://fonts\.googleapis\.com[^>]*>', "", html)

    css, used = inline_assets(css)
    html_body_assets = []
    html, used2 = inline_assets(html)
    used += used2

    # replacements go in through a lambda: the CSS and JS carry
    # backslashes that re would otherwise read as group references
    style = "<style>\n" + fonts + "\n" + css + "\n</style>"
    html = re.sub(r'<link[^>]+href="css/style\.css"[^>]*>',
                  lambda m: style, html)
    assert style in html, "could not place the stylesheet"

    script = "<script>\n" + js + "\n</script>"
    html = re.sub(r'<script src="js/main\.js"></script>',
                  lambda m: script, html)
    assert script in html, "could not place the script"

    # a note in the markup points at the file the webhook lives in; in a
    # bundle that file is the script below, so say so
    html = html.replace("inbound webhook set in js/main.js",
                        "inbound webhook set in the script below")

    assert not re.search(r'(?:href|src)="(?:css|js)/', html), "a file stayed linked"
    assert not re.search(r'["\(](?:\.\./)?assets/', html), "an asset stayed linked"
    return html, sorted(set(used))


GHL_CSS = """
<style>
/* ==========================================================
   FITTING INTO THE PAGE BUILDER
   GoHighLevel drops this code inside a padded, centred column.
   These rules let the site span the window again and paint the
   page its own colour, so no white band shows around it.
   Delete this block if the page is ever hosted on its own.
   ========================================================== */
html, body { background: #EDE8DB !important; }

/* Step back out of the builder's column */
main, .site-footer {
  width: 100vw;
  margin-left: calc(50% - 50vw);
  max-width: none;
}

/* The builder's own row and column add padding above the hero */
body .c-row, body .c-column, body .c-section, body .hl_page-preview--content {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}
</style>
"""

GHL_JS = """
<script>
/* ==========================================================
   SITTING FLUSH TO THE TOP
   Whatever padding the builder puts above this element, measure
   it once the page has settled and pull the site back up by
   exactly that much, so the hero starts at the top of the window.
   ========================================================== */
(function () {
  var site = document.querySelector("main");
  if (!site) return;

  function flush() {
    site.style.marginTop = "";
    var top = site.getBoundingClientRect().top + window.pageYOffset;
    if (top > 0.5) site.style.marginTop = (-top) + "px";
  }

  flush();
  window.addEventListener("load", flush);
  window.addEventListener("resize", flush);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(flush);
  /* the builder lays itself out in stages */
  [60, 200, 600, 1500].forEach(function (ms) { setTimeout(flush, ms); });
})();
</script>
"""


def fragment(html):
    """Strip the document shell so what is left can be pasted into a
    Custom Code element, which expects body content, not a page."""
    head = html.split("<head>", 1)[1].split("</head>", 1)[0]
    body = html.split("<body>", 1)[1].rsplit("</body>", 1)[0]

    keep = []
    for m in re.finditer(r"<(style|script)\b.*?</\1>", head, re.S):
        keep.append(m.group(0))
    # the slideshow list lives in the head; it must come before the script
    assert any("SLIDESHOW" in k for k in keep), "the slide list went missing"

    note = ("<!-- Timothy William Fenney Building & Remodeling — the whole\n"
            "     site, in one block. Paste it into a GoHighLevel Custom Code\n"
            "     element. The pictures are near the top, in the list marked\n"
            "     THE WORK. -->\n")
    return note + "\n".join(keep) + "\n" + body.strip() + "\n" + GHL_CSS + GHL_JS


def netlify_zip(path):
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        for name in ("index.html", "netlify.toml", "README.md"):
            full = os.path.join(ROOT, name)
            if os.path.exists(full):
                z.write(full, name)
        for folder in ("css", "js", "assets"):
            for dirpath, _, files in os.walk(os.path.join(ROOT, folder)):
                for f in files:
                    full = os.path.join(dirpath, f)
                    z.write(full, os.path.relpath(full, ROOT))


def main():
    os.makedirs(DIST, exist_ok=True)
    html, used = bundle()
    frag = fragment(html)

    out = {"fenney-standalone.html": html, "fenney-ghl.html": frag}
    for name, text in out.items():
        with open(os.path.join(DIST, name), "w", encoding="utf-8") as f:
            f.write(text)

    zip_path = os.path.join(DIST, "fenney-netlify.zip")
    netlify_zip(zip_path)

    print("inlined %d files (on disk -> in the bundle):" % len(used))
    for rel in used:
        disk = os.path.getsize(os.path.join(ROOT, rel)) / 1024
        print("   %-34s %6.0f KB -> %6.0f KB" % (rel, disk, len(encoded(rel)) / 1024))
    print()
    for name in list(out) + ["fenney-netlify.zip"]:
        print("   %-28s %6.0f KB" % (name, os.path.getsize(os.path.join(DIST, name)) / 1024))


if __name__ == "__main__":
    main()
