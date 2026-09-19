# L.A.C.E. — Continuation Notes

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build, verified working
```

## What I found

Your files had no `src/` skeleton, `main.jsx`, `App.jsx`, or router yet — just the
loose component/page files plus two exact duplicates (`AppShell (1).jsx`,
`Basics (1).jsx`, dropped). Their relative imports (`../../data/mockData`,
`../../../lib/gsap`, etc.) already implied a specific folder layout, so I
reconstructed that layout exactly rather than inventing a new one — every file
you gave me kept its code untouched except two import lines in `Landing.jsx`
(`./landing/Hero` → `./sections/Hero`, same for `SignatureStory`, since the
depth of `Hero.jsx`'s own imports only resolves if it lives in
`pages/landing/sections/`).

**Already complete (used as-is):** tokens.css, base.css, gsap/hooks, mockData,
Card/Basics/Overlay/ProductThumbnail/ComplianceRing/Charts, PackageArt,
PublicChrome, AppShell, MeasurementTool, RuleAccordion, ProcessingTimeline,
Login, Dashboard, ScanProduct, and the whole Landing/Hero/SignatureStory/
StoryStages storytelling flow — this was genuinely the most finished part of
the project.

**Partially complete:** `EvidenceViewer.jsx` was a 16-line stub (just a
`<PackageArt>` wrapper). I expanded it into the evidence half of the
inspection workspace — legend, zoom, and a leader-line callout driven by
whichever rule is selected in `RuleAccordion` — while keeping its original
prop shape. I also added `data-region-id` to `PackageArt`'s OCR boxes and let
its `<svg>` take an `onClick`, so clicking a box on the image can select a
region directly (needed for the click-to-inspect interaction; without it the
boxes were inert).

**Missing, now built:**
- `main.jsx` / `App.jsx` — there was no entry point or router at all.
- **Processing** (`/processing`) — runs the timeline you'd already built
  (Upload → Quality → OCR → Text Ordering → Rule Validation → Legibility →
  Verdict) against the demo package, then hands off to Verdict.
- **Verdict** (`/verdict/:id`) — the compact pass/warn/fail result page from
  section 9 of the brief, separate from the full workspace.
- **Inspection workspace** (`/inspection/:id`) — combines EvidenceViewer +
  RuleAccordion + MeasurementTool with a rule↔evidence tab switch.
- **Report** (`/report/:id`) — printable report using the existing
  `@media print` rules already in `base.css`; "Print / Save as PDF" calls
  `window.print()`.
- Products, History, Reports, Violations, Analytics, Settings — the sidebar
  in `AppShell.jsx` already linked to all of these, so I built light real
  pages for each (backed by the mock data you'd already written) rather than
  leaving dead links, per the "no dead ends" requirement in your brief.
- `src/styles/components.css` and `src/styles/pages.css` — every component
  and page referenced CSS classes that didn't exist anywhere yet (only the
  reset + a few utilities were in `base.css`). This was the single biggest
  gap: without it nothing had a visual style at all. Written against your
  the design tokens in `tokens.css`.

## Flow

```
/  →  /login  →  /dashboard  →  /scan  →  /processing  →  /verdict/:id
                                                  ↓                ↓
                                       /inspection/:id  ←──────────┘
                                                  ↓
                                            /report/:id
```

No dead ends: every sidebar/bottom-nav link in `AppShell` resolves to a real
page.

## What I didn't touch

Barcode-based measurement — never introduced, per your constraint. Product
photography — still the illustrated `PackageArt` throughout. No backend; all
data continues to come from `mockData.js`.

## Theme

The app uses a dark Slate + sky-blue theme. All colors live in `src/styles/tokens.css`:

| Role | Token | Value |
| --- | --- | --- |
| Page background | `--slate-900` | `#0f172a` |
| Cards / panels / sidebar | `--slate-800` | `#1e293b` |
| Borders / dividers | `--slate-700` | `#334155` |
| Headings / primary text | `--slate-50` | `#f8fafc` |
| Secondary text | `--slate-400` | `#94a3b8` |
| Inactive numbers / placeholders | `--slate-500` | `#64748b` |
| Primary accent | `--blue-400` / `--blue-500` | `#38bdf8` / `#3b82f6` |
| Success | `--green-500` | `#22c55e` |
| Floating overlays | `--overlay-bg` | `rgba(15, 23, 42, 0.9)` |
| Selected glow | `--glow` | `rgba(56, 189, 248, 0.15)` |

The older names (`--ivory`, `--paper`, `--ink`, `--forest`, ...) are kept as aliases of these
tokens, so every existing component picks the theme up automatically.

## Account name

`src/lib/auth.js` keeps the signed-in person's name for the session. On **Register** it is the
full name typed in; on **Login** it is looked up from an account created earlier with the same
email, otherwise derived from the email (`priya.nair@example.com` becomes "Priya Nair"), with a
role-based fallback for phone numbers. It shows in the landing navbar, the landing hero, the
dashboard greeting, the sidebar profile and Settings.

## Landing page image

The hero uses `src/assets/product-pack.webp` (the product photo, background removed). The
outlines and tags drawn over it are positioned in `REGIONS` in `Hero.jsx`, in the photo's own
1000 x 790 coordinate space. If the photo is swapped, update those boxes to match.
