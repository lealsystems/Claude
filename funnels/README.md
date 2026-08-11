# Cape Codder Quiz Funnels — Setup & Lead Automation

## The pages

| File | What it is |
|---|---|
| `quiz.html` | **All-in-one**: "What can we build for you?" picker + all 7 quizzes on one page |
| `windows-doors.html` | Single funnel (with Harvey/Andersen badges) |
| `siding.html`, `roofing.html`, `kitchen.html`, `bathroom.html`, `addition.html`, `custom.html` | Single funnels — best for per-trade ad campaigns |
| `index.html` | Simple hub that links to the single funnels |
| `dist/` | Self-contained builds of all pages — each file works alone; upload any one of them anywhere |

After editing anything, run `python3 build.py` to regenerate `dist/`.

## How to get every quiz result in your email

All funnels send leads to **one place**: the `LEAD_ENDPOINT` setting at the
top of `funnel.js` (in `dist/` files, search for `LEAD_ENDPOINT` in the file
itself). Set it once, every quiz uses it.

### Option A — Straight to your inbox, free, ~2 minutes (FormSubmit)

1. Set `LEAD_ENDPOINT = "https://formsubmit.co/ajax/capecodderhi@gmail.com"`.
2. Submit one test lead — FormSubmit emails you an activation link. Click it.
3. Done. Every quiz completion arrives as an email. The `_subject` field
   becomes the subject line (e.g. `New lead: roofing project — Jane Smith`)
   and every answer appears in the body.

### Option B — GoHighLevel (best for automation)

1. In GHL: **Automation → Workflows → New → Inbound Webhook** trigger.
2. Copy the webhook URL into `LEAD_ENDPOINT`.
3. Submit one test lead so GHL learns the fields, then map them (see table
   below) to contact fields / custom fields.
4. Add workflow actions: **Create Contact → Send internal email
   notification → SMS the lead → assign follow-up task.** The `summary`
   field is a ready-made email body — one merge tag and done.

### Option C — Zapier / Make

Catch Hook → Gmail "Send email" (or anything else). Map `summary` to the
body, `_subject` to the subject.

### Fallback (nothing configured)

With `LEAD_ENDPOINT` empty, the Send button opens the visitor's own email
app pre-addressed to capecodderhi@gmail.com. Works, but depends on the
visitor pressing send — set Option A up before running ads.

## The JSON payload (what your automation receives)

Flat fields, ready to map:

| Field | Example |
|---|---|
| `_subject` | `New lead: roofing project — Jane Smith` |
| `funnel` | `roofing` |
| `project` | `roofing project` |
| `name` / `phone` / `email` / `town` | contact info from the form |
| `q_<question-id>` | one field per question, e.g. `q_situation: "Leak / Storm Damage"`, `q_timeline: "As soon as possible"`, `q_details: "<the visitor's own words>"` |
| `summary` | the whole lead as formatted text — use as an email body |
| `page` / `submittedAt` | source URL and ISO timestamp |

Question IDs per funnel: windows-doors (`q_need, q_count, q_condition,
q_priority, q_property, q_timeline`) · siding (`q_scope, q_material, q_size,
q_timeline`) · roofing (`q_situation, q_material, q_age, q_timeline`) ·
kitchen (`q_scope, q_style, q_budget, q_timeline`) · bathroom (`q_scope,
q_count, q_style, q_timeline`) · addition (`q_type, q_size, q_details,
q_timeline`) · custom-build (`q_type, q_details, q_budget, q_timeline`).

Per-funnel overrides: set `endpoint: "…"` inside a page's `window.FUNNEL`
config to route just that trade somewhere else. Set `bookingUrl: "…"` to add
a **Book My Free Estimate** button (your GHL calendar) on the results screen.

## Partner logos (Harvey / Andersen)

The Windows & Doors funnel shows "Proud Installer Of" badges. They currently
use monogram placeholders. To show the official logos: save the files as
`harvey-logo.png` and `andersen-logo.png` in this folder, then run
`python3 build.py` — the build embeds them into the standalone files
automatically (the source pages pick them up with no changes at all).
