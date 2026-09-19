# LMPC Validation Engine

The Python half of the pipeline — everything after Rust has done OCR, blur
checking, deskewing, and barcode-based mm calibration. Matches the
"Deterministic Legal Validation Engine" box in the architecture diagram.

# to active virtual env   enc\Scripts\activate

## Run it

```bash
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001 or
uvicorn main:app --reload
 --workers 2
```

Smoke test without starting a server:
```bash
python test_engine.py
```

## What Rust sends it

`POST /validate` — see `models.py::ValidationRequest` for the exact schema.
The short version:

```json
{
  "image_id": "abc123",
  "raw_ocr_text": "full OCR string, used for declaration phrase matching",
  "mean_ocr_confidence": 0.91,
  "px_to_mm_scale_factor": 0.264,
  "fields": [
    { "field_hint": "mrp_candidate", "text": "MRP Rs 199.00", "font_height_mm": 2.3, "ocr_confidence": 0.93 },
    { "field_hint": "qty_candidate", "text": "Net Wt: 500g", "font_height_mm": 2.1, "ocr_confidence": 0.90 }
  ]
}
```

Rust owns the geometry — this service trusts `font_height_mm` on each field
as already-correct, converted from pixels via the barcode scale factor. If a
span had no reliable calibration (off the barcode's plane, curved surface,
etc.), send `font_height_mm: null` and the font validator will flag it as
`WARNING` instead of guessing.

`field_hint` is optional and non-authoritative — it's a hint Rust can pass
if it already suspects a span is the MRP or quantity line. The font
validator actually matches spans by checking whether the *extracted entity
text* (from GLiNER/regex) appears inside a field's `text` — so a hint isn't
required for the wiring to work, just a nice-to-have if Rust already knows.

## What it sends back

`ValidationResponse` — entities extracted, a verdict per field (MRP, net
quantity, date, address), a verdict per mandatory declaration phrase, a
verdict per font-height check, and one `overall_verdict`:

- **PASS** — every check passed.
- **HUMAN_REVIEW** — nothing outright failed, but something's borderline
  (font just under threshold, a soft declaration like consumer-care missing).
  Routes to your "Human Review / Physical Inspection" box.
- **FAIL** — a hard rule failed or a mandatory field is missing entirely.

`compliance_score` is just `passed_checks / total_checks` — a quick number
for the dashboard, not a substitute for reading the individual verdicts.

## Extraction: regex fallback vs GLiNER

`extractor.py` has two implementations behind one interface. Right now
`get_extractor()` will fall back to `RegexFallbackExtractor` automatically
if `gliner`/`torch` aren't installed or the model can't download — so the
service never crashes on a missing dependency, it just logs a warning and
degrades to regex extraction.

To turn on real GLiNER:
```bash
pip install gliner torch
```
then just restart the service — `get_extractor()` picks it up automatically,
no code change needed. Test both paths with `python test_engine.py`; it
prints which extractor is active at the top.

**Before this goes anywhere near production data**: the regex extractor is
for demoing the *rest* of the pipeline (validators, decision logic) without
needing a GPU or model download. Don't quote its extraction accuracy in your
pitch — GLiNER is what you actually built for messy real-world OCR text.

**Docker note**: `Dockerfile` in this directory installs `gliner`/`torch`
(CPU wheels) and pre-downloads the model weights at *build* time, so the
container always runs real GLiNER and needs no network access at runtime.
If you're running this service outside Docker (plain `uvicorn`), you still
need the manual `pip install` above to get GLiNER instead of the regex
fallback.

## Tuning without redeploying

All thresholds — font-height tiers, which declaration phrases are mandatory,
fuzzy-match score cutoffs, PIN/MRP/quantity regexes — live in `rules.json`,
not in code. Edit it and hit `POST /reload-rules` to pick up changes live,
useful when you're tuning thresholds against real sample photos during the
hackathon.

**Before using this for real compliance decisions**: the font-height mm
tiers and exact wording requirements in `rules.json` are placeholders based
on commonly-cited LMPC figures — verify every number against the current
official Legal Metrology (Packaged Commodities) Rules, 2011 gazette text
before treating any verdict as authoritative.

## Layout

```
validation_engine/
├── main.py              # FastAPI app — /health, /validate, /reload-rules
├── engine.py             # orchestrator + PASS/WARNING/FAIL/HUMAN_REVIEW decision logic
├── models.py             # request/response schemas (the Rust<->Python contract)
├── extractor.py           # GLiNER wrapper + regex fallback
├── rules.json             # all tunable thresholds — edit this, not the code
├── test_engine.py         # runnable smoke tests, 3 realistic sample cases
└── validators/
    ├── mrp.py
    ├── quantity.py
    ├── date.py
    ├── address.py
    ├── declarations.py    # RapidFuzz mandatory-phrase matching
    └── font_size.py        # compares Rust's mm calibration against LMPC tiers
```
