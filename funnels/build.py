#!/usr/bin/env python3
"""Build self-contained funnel pages into dist/.

Inlines funnel.css, funnel.js, and logo.png (as a base64 data URI) into
each HTML file so every page in dist/ works as a single standalone file —
double-clickable locally or uploadable to any host on its own.
"""
import base64
import pathlib

SRC = pathlib.Path(__file__).parent
DIST = SRC / "dist"
DIST.mkdir(exist_ok=True)

css = (SRC / "funnel.css").read_text(encoding="utf-8")
js = (SRC / "funnel.js").read_text(encoding="utf-8")
logo_b64 = base64.b64encode((SRC / "logo.png").read_bytes()).decode()
logo_uri = f"data:image/png;base64,{logo_b64}"

js_inline = js.replace('logo: "logo.png"', f'logo: "{logo_uri}"')

pages = ["index.html", "quiz.html", "windows-doors.html", "siding.html",
         "roofing.html", "kitchen.html", "bathroom.html"]

for name in pages:
    html = (SRC / name).read_text(encoding="utf-8")
    html = html.replace('<link rel="stylesheet" href="funnel.css">',
                        "<style>\n" + css + "\n</style>")
    html = html.replace('<script src="funnel.js"></script>',
                        "<script>\n" + js_inline + "\n</script>")
    html = html.replace('src="logo.png"', f'src="{logo_uri}"')
    (DIST / name).write_text(html, encoding="utf-8")
    print(f"built dist/{name}  ({len(html) // 1024} KB)")
