"""
Entity extraction from OCR text.

Two implementations behind one interface:
  - GLiNERExtractor    : the real zero-shot model (needs `pip install gliner torch`
                          and a network path to download weights on first run).
  - RegexFallbackExtractor : no ML deps, deterministic, good enough for demoing
                          the rest of the pipeline (validators, decision engine)
                          when the model isn't loaded — e.g. this sandbox, or CI.

get_extractor() picks GLiNER if available, otherwise falls back automatically
and logs a warning, so the service never hard-crashes on startup just because
the model isn't downloaded yet.
"""

from __future__ import annotations
import re
import logging
from typing import Protocol

logger = logging.getLogger("validation_engine.extractor")

ENTITY_LABELS = [
    "MRP",
    "net quantity",
    "manufacturing date",
    "address",
    "pin code",
    "manufacturer name",
    "consumer care",
    "country of origin",
    "batch number",
]


class Extractor(Protocol):
    def extract(self, text: str) -> dict: ...


class RegexFallbackExtractor:
    """Deterministic, dependency-free extractor. Not a replacement for GLiNER's
    generalization on messy real-world OCR — use this for local testing/demo
    of the validation pipeline, not for the actual accuracy claims in your pitch."""

    # Two-step MRP search: find the "MRP" keyword first, then look for a
    # price *within the next 60 characters after it* — not immediately
    # adjacent. This tolerates real packaging text like
    # "MRP (incl. of all taxes) Rs 199.00" where other words sit between
    # the label and the actual number, which a single strict pattern misses.
    _mrp_keyword_re = re.compile(r"(?i)(?:mrp|m\.r\.p\.?|maximum retail price)")
    _mrp_currency_prefixed_re = re.compile(r"(?i)(?:₹|rs\.?|inr)\s*([0-9]+(?:\.[0-9]{1,2})?)")
    _mrp_bare_number_re = re.compile(r"([0-9]+(?:\.[0-9]{1,2})?)")
    _MRP_SEARCH_WINDOW = 60  # chars to look ahead after the "MRP" keyword
    _qty_re = re.compile(r"(?i)(?:net\s*(?:wt|weight|qty|quantity)?[:\s]*)?(\d+(?:\.\d+)?)\s*(kg|g|gm|mg|ml|l)\b")
    _date_re = re.compile(
        r"(?i)(\d{1,2}[/\-]\d{4}|\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}|"
        r"(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*\d{4})"
    )
    _pin_re = re.compile(r"\b([1-9][0-9]{5})\b")
    _batch_re = re.compile(r"(?i)(?:batch|lot)\s*(?:no\.?|number)?[:\s]*([A-Za-z0-9\-]+)")

    def _extract_mrp(self, text: str) -> str | None:
        keyword_match = self._mrp_keyword_re.search(text)
        if not keyword_match:
            return None

        window = text[keyword_match.end(): keyword_match.end() + self._MRP_SEARCH_WINDOW]

        # Prefer a number that's actually marked with a currency symbol —
        # avoids accidentally grabbing an unrelated number (like a pack
        # count) that happens to sit between "MRP" and the real price.
        currency_match = self._mrp_currency_prefixed_re.search(window)
        if currency_match:
            return currency_match.group(1)

        # Fall back to the first bare number in the window if no currency
        # marker is found — better than returning nothing, but less certain.
        bare_match = self._mrp_bare_number_re.search(window)
        if bare_match:
            return bare_match.group(1)

        return None

    def extract(self, text: str) -> dict:
        out: dict = {}

        mrp_value = self._extract_mrp(text)
        if mrp_value:
            out["mrp"] = mrp_value

        m = self._qty_re.search(text)
        if m:
            out["net_quantity"] = f"{m.group(1)}{m.group(2).lower()}"

        m = self._date_re.search(text)
        if m:
            out["manufacturing_date"] = m.group(1)

        m = self._pin_re.search(text)
        if m:
            out["pin_code"] = m.group(1)

        m = self._batch_re.search(text)
        if m:
            out["batch_number"] = m.group(1)

        # Address is hard to regex reliably — grab the line containing the PIN
        # as a crude stand-in so the address validator has something to check.
        if "pin_code" in out:
            for line in text.splitlines():
                if out["pin_code"] in line:
                    out["address"] = line.strip()
                    break

        return out


class GLiNERExtractor:
    """Real zero-shot extractor. Import and model load are lazy so importing
    this module never fails just because torch/gliner aren't installed yet."""

    def __init__(self, model_name: str = "urchade/gliner_multi-v2.1", threshold: float = 0.4):
        from gliner import GLiNER  # deferred import
        self.model = GLiNER.from_pretrained(model_name)
        self.threshold = threshold

    def extract(self, text: str) -> dict:
        predictions = self.model.predict_entities(text, ENTITY_LABELS, threshold=self.threshold)
        out: dict = {}
        for p in predictions:
            key = p["label"].lower().replace(" ", "_")
            # keep the highest-scoring span per label
            if key not in out or p.get("score", 0) > out[key].get("_score", 0):
                out[key] = {"text": p["text"], "_score": p.get("score", 0)}
        return {k: v["text"] for k, v in out.items()}


def get_extractor() -> Extractor:
    try:
        return GLiNERExtractor()
    except Exception as e:  # noqa: BLE001 — intentionally broad, this is a startup fallback
        logger.warning(
            "GLiNER unavailable (%s) — falling back to RegexFallbackExtractor. "
            "Install `gliner` + `torch` and ensure model download access for production.",
            e,
        )
        return RegexFallbackExtractor()