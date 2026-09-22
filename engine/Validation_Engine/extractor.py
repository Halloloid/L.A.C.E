# # """
# # Entity extraction from OCR text + layout.

# # extract() now takes both the flattened text (for qty/pin, which don't have
# # label-vs-value ambiguity) AND the row-structured boxes (for mrp/date/batch,
# # which do — see reconstruct_rows()/find_value_near_label() below, which
# # should also be used in the notebook so both sides build rows the same way).
# # """

# # from __future__ import annotations
# # import re
# # import logging
# # from typing import Protocol
# # from datetime import datetime
# # from dateutil import parser as dateutil_parser

# # logger = logging.getLogger("validation_engine.extractor")

# # ENTITY_LABELS = [
# #     "price in rupees",
# #     "quantity with unit like grams or millilitres",
# #     "date",
# #     "postal address",
# #     "six digit postal code",
# #     "company or manufacturer name",
# #     "customer support phone number or email",
# #     "country name",
# #     "batch or lot code",
# # ]

# # LABEL_TO_KEY = {
# #     "price in rupees": "mrp",
# #     "quantity with unit like grams or millilitres": "net_quantity",
# #     "date": "manufacturing_date",
# #     "postal address": "address",
# #     "six digit postal code": "pin_code",
# #     "company or manufacturer name": "manufacturer_name",
# #     "customer support phone number or email": "consumer_care",
# #     "country name": "country_of_origin",
# #     "batch or lot code": "batch_number",
# # }


# # class Extractor(Protocol):
# #     def extract(self, text: str, rows: list[list[dict]] | None = None) -> dict: ...


# # def reconstruct_rows(fields: list[dict], tolerance_ratio: float = 0.5) -> list[list[dict]]:
# #     if not fields:
# #         return []
# #     heights = [f["bbox"][3] - f["bbox"][1] for f in fields]
# #     median_h = sorted(heights)[len(heights) // 2]
# #     y_tolerance = median_h * tolerance_ratio

# #     items = sorted(fields, key=lambda f: (f["bbox"][1] + f["bbox"][3]) / 2)
# #     rows: list[list[dict]] = []
# #     for item in items:
# #         y_center = (item["bbox"][1] + item["bbox"][3]) / 2
# #         placed = False
# #         for row in rows:
# #             row_y = sum((r["bbox"][1] + r["bbox"][3]) / 2 for r in row) / len(row)
# #             if abs(y_center - row_y) <= y_tolerance:
# #                 row.append(item)
# #                 placed = True
# #                 break
# #         if not placed:
# #             rows.append([item])
# #     return [sorted(row, key=lambda f: f["bbox"][0]) for row in rows]


# # def find_value_near_label(
# #     rows: list[list[dict]],
# #     label_box: dict,
# #     value_pattern: re.Pattern,
# #     max_row_radius: int = 2,
# # ) -> str | None:
# #     label_row_idx = next((i for i, row in enumerate(rows) if label_box in row), None)
# #     if label_row_idx is None:
# #         return None
# #     label_x_start, label_x_end = label_box["bbox"][0], label_box["bbox"][2]

# #     def try_match(box: dict) -> str | None:
# #         if box is label_box:
# #             return None
# #         m = value_pattern.search(box["text"])
# #         if m:
# #             return m.group(1) if m.groups() else m.group(0)
# #         return None

# #     for f in sorted(rows[label_row_idx], key=lambda f: f["bbox"][0]):
# #         if f["bbox"][0] >= label_x_end:
# #             hit = try_match(f)
# #             if hit:
# #                 return hit

# #     for offset in range(1, max_row_radius + 1):
# #         idx = label_row_idx + offset
# #         if idx >= len(rows):
# #             break
# #         for f in sorted(rows[idx], key=lambda f: abs(f["bbox"][0] - label_x_start)):
# #             hit = try_match(f)
# #             if hit:
# #                 return hit

# #     for f in sorted(rows[label_row_idx], key=lambda f: -f["bbox"][0]):
# #         if f["bbox"][2] <= label_x_start:
# #             hit = try_match(f)
# #             if hit:
# #                 return hit

# #     for offset in range(1, max_row_radius + 1):
# #         idx = label_row_idx - offset
# #         if idx < 0:
# #             break
# #         for f in sorted(rows[idx], key=lambda f: abs(f["bbox"][0] - label_x_start)):
# #             hit = try_match(f)
# #             if hit:
# #                 return hit

# #     return None


# # def _find_label_box(rows: list[list[dict]], keyword_re: re.Pattern) -> dict | None:
# #     for row in rows:
# #         for f in row:
# #             if keyword_re.search(f["text"]):
# #                 return f
# #     return None


# # class RegexFallbackExtractor:
# #     _mrp_keyword_re = re.compile(r"(?i)(?:mrp|m\.r\.p\.?|maximum retail price)")
# #     _mrp_currency_re = re.compile(r"(?i)(?:₹|rs\.?|inr)\s*([0-9]+(?:\.[0-9]{1,2})?)")
# #     _decimal_price_re = re.compile(r"(?<!\()\b([0-9]+\.[0-9]{2})\b(?!\))")
# #     _bare_number_re = re.compile(r"\b([0-9]+(?:\.[0-9]{1,2})?)\b")

# #     _qty_re = re.compile(r"(?i)(?:net\s*(?:wt|weight|qty|quantity)?[:\s]*)?(\d+(?:\.\d+)?)\s*(kg|g|gm|mg|ml|l)\b")
# #     _qty_total_re = re.compile(r"(?i)=\s*(\d+(?:\.\d+)?)\s*(kg|g|gm|mg|ml|l)\b")
# #     # Last-resort fallback: in some fonts (especially stylized packaging
# #     # fonts), OCR misreads a lowercase "g" as the digit "9" — e.g. "110 g"
# #     # comes back as "110 9". Only used if the proper unit regexes above find
# #     # nothing at all, specifically to avoid ever overriding a correctly-read
# #     # unit.
# #     _qty_ocr_confusable_re = re.compile(r"\b(\d+(?:\.\d+)?)\s*9\b")

# #     _date_re = re.compile(
# #         r"(?i)("
# #         r"\d{1,2}\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*\d{2,4}|"
# #         r"\d{1,2}[/\-]\d{4}|"
# #         r"\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}|"
# #         r"(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*\d{2,4}"
# #         r")"
# #     )
# #     _mfg_keyword_re = re.compile(r"(?i)\b(?:pkd|pkg|mfg|mfd|manufactured|packed|packaging\s*date)\b")
# #     _expiry_keyword_re = re.compile(r"(?i)\b(?:use\s*by|expiry|exp\.?|best\s*before)\b")
# #     _pin_re = re.compile(r"\b([1-9][0-9]{5})\b")
# #     _batch_keyword_re = re.compile(r"(?i)\b(?:batch|lot)\s*(?:no\.?|number)?\b")
# #     # Require at least one digit — a real batch/lot code always has one
# #     # (02B18, B082698), but a plain English word like "MACHINE" or "VALUES"
# #     # never does, and can otherwise be the geometrically-nearest match.
# #     _batch_value_re = re.compile(r"\b(?=[A-Z0-9]*[0-9])[A-Z0-9]{4,10}\b")

# #     def _extract_mrp_geo(self, rows: list[list[dict]]) -> str | None:
# #         label_box = _find_label_box(rows, self._mrp_keyword_re)
# #         if not label_box:
# #             return None
# #         for pattern in (self._mrp_currency_re, self._decimal_price_re, self._bare_number_re):
# #             # Check inside the label's OWN box first — sometimes OCR keeps
# #             # the label and value together as one line (e.g. "MRP Rs 199.00"
# #             # detected as a single box) rather than splitting them.
# #             same_box_match = pattern.search(label_box["text"])
# #             if same_box_match:
# #                 return same_box_match.group(1) if same_box_match.groups() else same_box_match.group(0)
# #             hit = find_value_near_label(rows, label_box, pattern)
# #             if hit:
# #                 return hit
# #         return None

# #     def _extract_date_geo(self, rows: list[list[dict]], keyword_re: re.Pattern) -> str | None:
# #         label_box = _find_label_box(rows, keyword_re)
# #         if not label_box:
# #             return None
# #         return find_value_near_label(rows, label_box, self._date_re)

# #     def _extract_batch_geo(self, rows: list[list[dict]]) -> str | None:
# #         label_box = _find_label_box(rows, self._batch_keyword_re)
# #         if not label_box:
# #             return None
# #         return find_value_near_label(rows, label_box, self._batch_value_re)

# #     def _extract_dates_by_time_direction(self, text: str) -> tuple[str | None, str | None]:
# #         """Classify every date found in the text as manufacturing (past) or
# #         expiry (future) using the date VALUE itself, not its position on the
# #         label. This is deliberately independent of row-clustering/geometry —
# #         a manufacturing date is always in the past and an expiry date is
# #         always in the future, a fact that holds regardless of how a curved
# #         or warped photo scrambles apparent spatial layout. Far more robust
# #         for this specific field than any position-based heuristic."""
# #         now = datetime.now()
# #         past_candidates: list[tuple[datetime, str]] = []
# #         future_candidates: list[tuple[datetime, str]] = []

# #         for m in self._date_re.finditer(text):
# #             raw = m.group(1)
# #             try:
# #                 parsed = dateutil_parser.parse(raw, dayfirst=True, fuzzy=True, default=datetime(1, 1, 1))
# #             except (ValueError, OverflowError):
# #                 continue
# #             if parsed.year == 1:  # dateutil couldn't actually resolve a year — skip, unreliable
# #                 continue
# #             (past_candidates if parsed <= now else future_candidates).append((parsed, raw))

# #         mfg_date = max(past_candidates, key=lambda c: c[0])[1] if past_candidates else None  # most recent past
# #         expiry_date = min(future_candidates, key=lambda c: c[0])[1] if future_candidates else None  # nearest future
# #         return mfg_date, expiry_date

# #     def extract(self, text: str, rows: list[list[dict]] | None = None) -> dict:
# #         out: dict = {}

# #         if rows:
# #             mrp_value = self._extract_mrp_geo(rows)
# #             if mrp_value:
# #                 out["mrp"] = mrp_value

# #             batch_value = self._extract_batch_geo(rows)
# #             if batch_value:
# #                 out["batch_number"] = batch_value
# #         else:
# #             logger.warning(
# #                 "No row structure passed to extract() — mrp/batch "
# #                 "extraction skipped (text-only fallback removed as unreliable)."
# #             )

# #         # Dates: classified by time direction (past vs future) over the
# #         # WHOLE flattened text, not tied to row/keyword proximity — see
# #         # _extract_dates_by_time_direction() for why this is more robust
# #         # than geometry here specifically.
# #         mfg_date, expiry_date = self._extract_dates_by_time_direction(text)
# #         if mfg_date:
# #             out["manufacturing_date"] = mfg_date
# #         if expiry_date:
# #             out["expiry_date"] = expiry_date

# #         m = self._qty_total_re.search(text)
# #         if not m:
# #             m = self._qty_re.search(text)
# #         if m:
# #             out["net_quantity"] = f"{m.group(1)}{m.group(2).lower()}"
# #         else:
# #             # Neither proper-unit pattern matched at all — try the "9 read
# #             # as g" OCR-confusion fallback before giving up entirely.
# #             m = self._qty_ocr_confusable_re.search(text)
# #             if m:
# #                 out["net_quantity"] = f"{m.group(1)}g"
# #                 logger.info(
# #                     "net_quantity matched via OCR-confusable '9'->'g' fallback "
# #                     "(raw text had '%s 9') — verify this is correct, not guaranteed.",
# #                     m.group(1),
# #                 )

# #         m = self._pin_re.search(text)
# #         if m:
# #             out["pin_code"] = m.group(1)

# #         if "pin_code" in out:
# #             for line in text.splitlines():
# #                 if out["pin_code"] in line:
# #                     out["address"] = line.strip()
# #                     break

# #         return out


# # class GLiNERExtractor:
# #     def __init__(self, model_name: str = "urchade/gliner_multi-v2.1", threshold: float = 0.4):
# #         from gliner import GLiNER
# #         self.model = GLiNER.from_pretrained(model_name)
# #         self.threshold = threshold

# #     def extract(self, text: str, rows: list[list[dict]] | None = None) -> dict:
# #         predictions = self.model.predict_entities(text, ENTITY_LABELS, threshold=self.threshold)
# #         by_key: dict[str, list[dict]] = {}
# #         for p in predictions:
# #             key = LABEL_TO_KEY.get(p["label"], p["label"].lower().replace(" ", "_"))
# #             by_key.setdefault(key, []).append(p)

# #         out: dict = {}
# #         for key, spans in by_key.items():
# #             if key != "manufacturing_date":
# #                 best = max(spans, key=lambda s: s.get("score", 0))
# #                 out[key] = best["text"]

# #         date_spans = by_key.get("manufacturing_date", [])
# #         if date_spans:
# #             mfg_kw = re.search(r"(?i)\b(?:pkd|pkg|mfg|mfd|manufactured|packed|packaging\s*date)\b", text)
# #             expiry_kw = re.search(r"(?i)\b(?:use\s*by|expiry|exp\.?|best\s*before)\b", text)

# #             def nearest_span(keyword_match):
# #                 if not keyword_match:
# #                     return None
# #                 return min(date_spans, key=lambda s: abs(s["start"] - keyword_match.start()))

# #             mfg_span = nearest_span(mfg_kw)
# #             expiry_span = nearest_span(expiry_kw)

# #             if mfg_span:
# #                 out["manufacturing_date"] = mfg_span["text"]
# #             elif date_spans:
# #                 out["manufacturing_date"] = max(date_spans, key=lambda s: s.get("score", 0))["text"]

# #             if expiry_span and (not mfg_span or expiry_span["text"] != mfg_span["text"]):
# #                 out["expiry_date"] = expiry_span["text"]

# #         return out


# # def get_extractor() -> Extractor:
# #     import os

# #     forced = os.environ.get("FORCE_EXTRACTOR", "").strip().lower()
# #     if forced == "regex":
# #         logger.info("FORCE_EXTRACTOR=regex — using RegexFallbackExtractor explicitly.")
# #         return RegexFallbackExtractor()
# #     if forced == "gliner":
# #         logger.info("FORCE_EXTRACTOR=gliner — forcing GLiNERExtractor (will raise if unavailable).")
# #         return GLiNERExtractor()

# #     try:
# #         return GLiNERExtractor()
# #     except Exception as e:
# #         logger.warning(
# #             "GLiNER unavailable (%s) — falling back to RegexFallbackExtractor. "
# #             "Install `gliner` + `torch` and ensure model download access for production.",
# #             e,
# #         )
# #         return RegexFallbackExtractor()
# """
# Entity extraction from OCR text + layout.

# extract() now takes both the flattened text (for qty/pin, which don't have
# label-vs-value ambiguity) AND the row-structured boxes (for mrp/date/batch,
# which do — see reconstruct_rows()/find_value_near_label() below, which
# should also be used in the notebook so both sides build rows the same way).
# """

# from __future__ import annotations
# import re
# import logging
# from typing import Protocol
# from datetime import datetime
# from dateutil import parser as dateutil_parser

# logger = logging.getLogger("validation_engine.extractor")

# ENTITY_LABELS = [
#     "price in rupees",
#     "quantity with unit like grams or millilitres",
#     "date",
#     "postal address",
#     "six digit postal code",
#     "company or manufacturer name",
#     "customer support phone number or email",
#     "country name",
#     "batch or lot code",
# ]

# LABEL_TO_KEY = {
#     "price in rupees": "mrp",
#     "quantity with unit like grams or millilitres": "net_quantity",
#     "date": "manufacturing_date",
#     "postal address": "address",
#     "six digit postal code": "pin_code",
#     "company or manufacturer name": "manufacturer_name",
#     "customer support phone number or email": "consumer_care",
#     "country name": "country_of_origin",
#     "batch or lot code": "batch_number",
# }


# class Extractor(Protocol):
#     def extract(self, text: str, rows: list[list[dict]] | None = None) -> dict: ...


# def reconstruct_rows(fields: list[dict], tolerance_ratio: float = 0.5) -> list[list[dict]]:
#     if not fields:
#         return []
#     heights = [f["bbox"][3] - f["bbox"][1] for f in fields]
#     median_h = sorted(heights)[len(heights) // 2]
#     y_tolerance = median_h * tolerance_ratio

#     items = sorted(fields, key=lambda f: (f["bbox"][1] + f["bbox"][3]) / 2)
#     rows: list[list[dict]] = []
#     for item in items:
#         y_center = (item["bbox"][1] + item["bbox"][3]) / 2
#         placed = False
#         for row in rows:
#             row_y = sum((r["bbox"][1] + r["bbox"][3]) / 2 for r in row) / len(row)
#             if abs(y_center - row_y) <= y_tolerance:
#                 row.append(item)
#                 placed = True
#                 break
#         if not placed:
#             rows.append([item])
#     return [sorted(row, key=lambda f: f["bbox"][0]) for row in rows]


# def find_value_near_label(
#     rows: list[list[dict]],
#     label_box: dict,
#     value_pattern: re.Pattern,
#     max_row_radius: int = 2,
# ) -> str | None:
#     label_row_idx = next((i for i, row in enumerate(rows) if label_box in row), None)
#     if label_row_idx is None:
#         return None
#     label_x_start, label_x_end = label_box["bbox"][0], label_box["bbox"][2]

#     def try_match(box: dict) -> str | None:
#         if box is label_box:
#             return None
#         m = value_pattern.search(box["text"])
#         if m:
#             return m.group(1) if m.groups() else m.group(0)
#         return None

#     for f in sorted(rows[label_row_idx], key=lambda f: f["bbox"][0]):
#         if f["bbox"][0] >= label_x_end:
#             hit = try_match(f)
#             if hit:
#                 return hit

#     for offset in range(1, max_row_radius + 1):
#         idx = label_row_idx + offset
#         if idx >= len(rows):
#             break
#         for f in sorted(rows[idx], key=lambda f: abs(f["bbox"][0] - label_x_start)):
#             hit = try_match(f)
#             if hit:
#                 return hit

#     for f in sorted(rows[label_row_idx], key=lambda f: -f["bbox"][0]):
#         if f["bbox"][2] <= label_x_start:
#             hit = try_match(f)
#             if hit:
#                 return hit

#     for offset in range(1, max_row_radius + 1):
#         idx = label_row_idx - offset
#         if idx < 0:
#             break
#         for f in sorted(rows[idx], key=lambda f: abs(f["bbox"][0] - label_x_start)):
#             hit = try_match(f)
#             if hit:
#                 return hit

#     return None


# def _find_label_box(rows: list[list[dict]], keyword_re: re.Pattern) -> dict | None:
#     for row in rows:
#         for f in row:
#             if keyword_re.search(f["text"]):
#                 return f
#     return None


# class RegexFallbackExtractor:
#     _mrp_keyword_re = re.compile(r"(?i)(?:mrp|m\.r\.p\.?|maximum retail price)")
#     _mrp_currency_prefixed_re = re.compile(r"(?i)(?:₹|rs\.?|inr)?\s*([0-9]+(?:\.[0-9]{1,2})?)")
#     _mrp_bare_number_re = re.compile(r"\b([0-9]+(?:\.[0-9]{1,2})?)\b")
#     _MRP_SEARCH_WINDOW = 120  # increased window to tolerate multi-line OCR layouts
    
#     _qty_keyword_re = re.compile(r"(?i)(?:net\s*(?:wt|weight|qty|quantity)?)")
#     _qty_value_re = re.compile(r"(\d+(?:\.\d+)?)\s*(kg|g|gm|mg|ml|l)\b", re.IGNORECASE)
#     _QTY_SEARCH_WINDOW = 60

#     _date_re = re.compile(
#         r"(?i)("
#         r"\d{1,2}\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*\d{2,4}|"
#         r"\d{1,2}[/\-]\d{4}|"
#         r"\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}|"
#         r"(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*\d{2,4}"
#         r")"
#     )
#     _mfg_keyword_re = re.compile(r"(?i)\b(?:pkd|pkg|mfg|mfd|manufactured|packed|packaging\s*date)\b")
#     _expiry_keyword_re = re.compile(r"(?i)\b(?:use\s*by|expiry|exp\.?|best\s*before)\b")
#     _pin_re = re.compile(r"\b([1-9][0-9]{5})\b")
#     _batch_keyword_re = re.compile(r"(?i)\b(?:batch|lot)\s*(?:no\.?|number)?\b")
#     # Require at least one digit — a real batch/lot code always has one
#     # (02B18, B082698), but a plain English word like "MACHINE" or "VALUES"
#     # never does, and can otherwise be the geometrically-nearest match.
#     _batch_value_re = re.compile(r"\b(?=[A-Z0-9]*[0-9])[A-Z0-9]{4,10}\b")

#     def _extract_mrp_geo(self, rows: list[list[dict]]) -> str | None:
#         label_box = _find_label_box(rows, self._mrp_keyword_re)
#         if not label_box:
#             return None

#         window = text[keyword_match.end(): keyword_match.end() + self._MRP_SEARCH_WINDOW]

#         currency_match = self._mrp_currency_prefixed_re.search(window)
#         if currency_match:
#             # ensure it's not just a stray single digit like '1' if there's a real price further down
#             val_str = currency_match.group(1)
#             # if we matched a small integer like '1' right after MRP, keep searching for a proper price if possible
#             if val_str == "1" or val_str == "0":
#                 rest_window = window[currency_match.end():]
#                 second_match = self._mrp_currency_prefixed_re.search(rest_window)
#                 if second_match and float(second_match.group(1)) > 1:
#                     return second_match.group(1)
#             return val_str

#         bare_match = self._mrp_bare_number_re.search(window)
#         if bare_match:
#             return bare_match.group(1)

#         return None

#     def _extract_net_quantity(self, text: str) -> str | None:
#         keyword_match = self._qty_keyword_re.search(text)
#         if not keyword_match:
#             # Fallback: try direct regex search anywhere if keyword wasn't found
#             m = re.search(r"(?i)(\d+(?:\.\d+)?)\s*(kg|g|gm|mg|ml|l)\b", text)
#             if m:
#                 return f"{m.group(1)}{m.group(2).lower()}"
#             return None

#         window = text[keyword_match.end(): keyword_match.end() + self._QTY_SEARCH_WINDOW]
#         m = self._qty_value_re.search(window)
#         if m:
#             return f"{m.group(1)}{m.group(2).lower()}"

#         # If not found immediately after keyword, check global search as fallback
#         m_global = re.search(r"(?i)(\d+(?:\.\d+)?)\s*(kg|g|gm|mg|ml|l)\b", text)
#         if m_global:
#             return f"{m_global.group(1)}{m_global.group(2).lower()}"

#         return None

#     def extract(self, text: str) -> dict:
#         out: dict = {}

#         if rows:
#             mrp_value = self._extract_mrp_geo(rows)
#             if mrp_value:
#                 out["mrp"] = mrp_value

#         qty_value = self._extract_net_quantity(text)
#         if qty_value:
#             out["net_quantity"] = qty_value

#             batch_value = self._extract_batch_geo(rows)
#             if batch_value:
#                 out["batch_number"] = batch_value
#         else:
#             logger.warning(
#                 "No row structure passed to extract() — mrp/net_quantity/batch "
#                 "extraction skipped (text-only fallback removed as unreliable)."
#             )

#         # Dates: classified by time direction (past vs future) over the
#         # WHOLE flattened text, not tied to row/keyword proximity — see
#         # _extract_dates_by_time_direction() for why this is more robust
#         # than geometry here specifically.
#         mfg_date, expiry_date = self._extract_dates_by_time_direction(text)
#         if mfg_date:
#             out["manufacturing_date"] = mfg_date
#         if expiry_date:
#             out["expiry_date"] = expiry_date

#         # net_quantity fallback if geometric search found nothing at all
#         # (e.g. no rows available) — global text search, last resort only.
#         if "net_quantity" not in out:
#             m = self._qty_total_re.search(text) or self._qty_re.search(text)
#             if m:
#                 out["net_quantity"] = re.sub(r"\s+", "", m.group(1)).lower()

#         m = self._pin_re.search(text)
#         if m:
#             out["pin_code"] = m.group(1)

#         m = self._batch_re.search(text)
#         if m:
#             out["batch_number"] = m.group(1)

#         # Address is hard to regex reliably — grab the line containing the PIN
#         # plus preceding address lines for complete context.
#         if "pin_code" in out:
#             lines = text.splitlines()
#             for i, line in enumerate(lines):
#                 if out["pin_code"] in line:
#                     start_idx = max(0, i - 2)
#                     address_lines = [l.strip() for l in lines[start_idx: i + 1] if l.strip()]
#                     out["address"] = ", ".join(address_lines)
#                     break

#         return out


# class GLiNERExtractor(RegexFallbackExtractor):
#     """Real zero-shot extractor with RegexFallbackExtractor as a robust fallback
#     for fields that GLiNER misses on messy OCR."""

#     def __init__(self, model_name: str = "urchade/gliner_multi-v2.1", threshold: float = 0.4):
#         from gliner import GLiNER
#         self.model = GLiNER.from_pretrained(model_name)
#         self.threshold = threshold

#     def extract(self, text: str, rows: list[list[dict]] | None = None) -> dict:
#         predictions = self.model.predict_entities(text, ENTITY_LABELS, threshold=self.threshold)
#         by_key: dict[str, list[dict]] = {}
#         for p in predictions:
#             key = p["label"].lower().replace(" ", "_")
#             # keep the highest-scoring span per label
#             if key not in out or p.get("score", 0) > out[key].get("_score", 0):
#                 out[key] = {"text": p["text"], "_score": p.get("score", 0)}
        
#         # Convert to plain text dict
#         result = {k: v["text"] for k, v in out.items()}

#         # Fallback fill-in using RegexFallbackExtractor methods if critical fields were missed by GLiNER
#         regex_fallback = super().extract(text)
#         for k, v in regex_fallback.items():
#             if k not in result or not result[k]:
#                 result[k] = v

#         return result


# def get_extractor() -> Extractor:
#     import os

#     forced = os.environ.get("FORCE_EXTRACTOR", "").strip().lower()
#     if forced == "regex":
#         logger.info("FORCE_EXTRACTOR=regex — using RegexFallbackExtractor explicitly.")
#         return RegexFallbackExtractor()
#     if forced == "gliner":
#         logger.info("FORCE_EXTRACTOR=gliner — forcing GLiNERExtractor (will raise if unavailable).")
#         return GLiNERExtractor()

#     try:
#         return GLiNERExtractor()
#     except Exception as e:
#         logger.warning(
#             "GLiNER unavailable (%s) — falling back to RegexFallbackExtractor. "
#             "Install `gliner` + `torch` and ensure model download access for production.",
#             e,
#         )
#         return RegexFallbackExtractor()
"""
Entity extraction from OCR text + layout.

extract() now takes both the flattened text (for qty/pin, which don't have
label-vs-value ambiguity) AND the row-structured boxes (for mrp/date/batch,
which do — see reconstruct_rows()/find_value_near_label() below, which
should also be used in the notebook so both sides build rows the same way).
"""

from __future__ import annotations
import re
import logging
from typing import Protocol
from datetime import datetime
from dateutil import parser as dateutil_parser

logger = logging.getLogger("validation_engine.extractor")

ENTITY_LABELS = [
    "price in rupees",
    "quantity with unit like grams or millilitres",
    "date",
    "postal address",
    "six digit postal code",
    "company or manufacturer name",
    "customer support phone number or email",
    "country name",
    "batch or lot code",
]

LABEL_TO_KEY = {
    "price in rupees": "mrp",
    "quantity with unit like grams or millilitres": "net_quantity",
    "date": "manufacturing_date",
    "postal address": "address",
    "six digit postal code": "pin_code",
    "company or manufacturer name": "manufacturer_name",
    "customer support phone number or email": "consumer_care",
    "country name": "country_of_origin",
    "batch or lot code": "batch_number",
}


class Extractor(Protocol):
    def extract(self, text: str, rows: list[list[dict]] | None = None) -> dict: ...


def reconstruct_rows(fields: list[dict], tolerance_ratio: float = 0.5) -> list[list[dict]]:
    if not fields:
        return []
    heights = [f["bbox"][3] - f["bbox"][1] for f in fields]
    median_h = sorted(heights)[len(heights) // 2]
    y_tolerance = median_h * tolerance_ratio

    items = sorted(fields, key=lambda f: (f["bbox"][1] + f["bbox"][3]) / 2)
    rows: list[list[dict]] = []
    for item in items:
        y_center = (item["bbox"][1] + item["bbox"][3]) / 2
        placed = False
        for row in rows:
            row_y = sum((r["bbox"][1] + r["bbox"][3]) / 2 for r in row) / len(row)
            if abs(y_center - row_y) <= y_tolerance:
                row.append(item)
                placed = True
                break
        if not placed:
            rows.append([item])
    return [sorted(row, key=lambda f: f["bbox"][0]) for row in rows]


def find_value_near_label(
    rows: list[list[dict]],
    label_box: dict,
    value_pattern: re.Pattern,
    max_row_radius: int = 2,
) -> str | None:
    label_row_idx = next((i for i, row in enumerate(rows) if label_box in row), None)
    if label_row_idx is None:
        return None
    label_x_start, label_x_end = label_box["bbox"][0], label_box["bbox"][2]

    def try_match(box: dict) -> str | None:
        if box is label_box:
            return None
        m = value_pattern.search(box["text"])
        if m:
            return m.group(1) if m.groups() else m.group(0)
        return None

    for f in sorted(rows[label_row_idx], key=lambda f: f["bbox"][0]):
        if f["bbox"][0] >= label_x_end:
            hit = try_match(f)
            if hit:
                return hit

    for offset in range(1, max_row_radius + 1):
        idx = label_row_idx + offset
        if idx >= len(rows):
            break
        for f in sorted(rows[idx], key=lambda f: abs(f["bbox"][0] - label_x_start)):
            hit = try_match(f)
            if hit:
                return hit

    for f in sorted(rows[label_row_idx], key=lambda f: -f["bbox"][0]):
        if f["bbox"][2] <= label_x_start:
            hit = try_match(f)
            if hit:
                return hit

    for offset in range(1, max_row_radius + 1):
        idx = label_row_idx - offset
        if idx < 0:
            break
        for f in sorted(rows[idx], key=lambda f: abs(f["bbox"][0] - label_x_start)):
            hit = try_match(f)
            if hit:
                return hit

    return None


def _find_label_box(rows: list[list[dict]], keyword_re: re.Pattern) -> dict | None:
    for row in rows:
        for f in row:
            if keyword_re.search(f["text"]):
                return f
    return None


class RegexFallbackExtractor:
    _mrp_keyword_re = re.compile(r"(?i)(?:mrp|m\.r\.p\.?|maximum retail price)")
    _mrp_currency_re = re.compile(r"(?i)(?:₹|rs\.?|inr)\s*([0-9]+(?:\.[0-9]{1,2})?)")
    _decimal_price_re = re.compile(r"(?<!\()\b([0-9]+\.[0-9]{2})\b(?!\))")
    _bare_number_re = re.compile(r"\b([0-9]+(?:\.[0-9]{1,2})?)\b")

    _net_qty_keyword_re = re.compile(r"(?i)\bn?et\s*(?:wt\.?|weight|qty\.?|quantity)\b")
    # Single capture group (number+unit together) so this works cleanly with
    # find_value_near_label(), which returns group(1) as the whole answer.
    _qty_re = re.compile(r"(?i)(\d+(?:\.\d+)?\s*(?:kg|g|gm|mg|ml|l))\b")
    _qty_total_re = re.compile(r"(?i)=\s*(\d+(?:\.\d+)?\s*(?:kg|g|gm|mg|ml|l))\b")
    _qty_ocr_confusable_re = re.compile(r"\b(\d+(?:\.\d+)?)\s*9\b")

    _date_re = re.compile(
        r"(?i)("
        r"\d{1,2}\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*\d{2,4}|"
        r"\d{1,2}[/\-]\d{4}|"
        r"\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}|"
        r"(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*\d{2,4}"
        r")"
    )
    _mfg_keyword_re = re.compile(r"(?i)\b(?:pkd|pkg|mfg|mfd|manufactured|packed|packaging\s*date)\b")
    _expiry_keyword_re = re.compile(r"(?i)\b(?:use\s*by|expiry|exp\.?|best\s*before)\b")
    _pin_re = re.compile(r"\b([1-9][0-9]{2})[\s\-]([0-9]{3})\b|\b([1-9][0-9]{5})\b")
    _batch_keyword_re = re.compile(r"(?i)\b(?:batch|lot)\s*(?:no\.?|number)?\b")
    # Require at least one digit — a real batch/lot code always has one
    # (02B18, B082698), but a plain English word like "MACHINE" or "VALUES"
    # never does, and can otherwise be the geometrically-nearest match.
    _batch_value_re = re.compile(r"\b(?=[A-Z0-9]*[0-9])[A-Z0-9]{4,10}\b")

    def _extract_mrp_geo(self, rows: list[list[dict]]) -> str | None:
        label_box = _find_label_box(rows, self._mrp_keyword_re)
        if not label_box:
            return None
        for pattern in (self._mrp_currency_re, self._decimal_price_re, self._bare_number_re):
            # Check inside the label's OWN box first — sometimes OCR keeps
            # the label and value together as one line (e.g. "MRP Rs 199.00"
            # detected as a single box) rather than splitting them.
            same_box_match = pattern.search(label_box["text"])
            if same_box_match:
                return same_box_match.group(1) if same_box_match.groups() else same_box_match.group(0)
            hit = find_value_near_label(rows, label_box, pattern)
            if hit:
                return hit
        return None

    def _extract_date_geo(self, rows: list[list[dict]], keyword_re: re.Pattern) -> str | None:
        label_box = _find_label_box(rows, keyword_re)
        if not label_box:
            return None
        return find_value_near_label(rows, label_box, self._date_re)

    def _extract_batch_geo(self, rows: list[list[dict]]) -> str | None:
        label_box = _find_label_box(rows, self._batch_keyword_re)
        if not label_box:
            return None
        return find_value_near_label(rows, label_box, self._batch_value_re)

    def _extract_dates_by_time_direction(self, text: str) -> tuple[str | None, str | None]:
        """Classify dates by relative ORDER (earliest = manufacturing,
        latest = expiry), not by comparing each one to today's date
        independently. A manufacturing date always precedes its expiry date
        — that holds whether the product is currently valid (mfg in the
        past, expiry in the future) OR already expired (BOTH dates in the
        past, e.g. old stock or a test sample) — but comparing each date to
        'today' independently breaks in that second case, since 'most
        recent past date' isn't the same as 'the manufacturing date' once
        expiry has also already passed."""
        parsed_candidates: list[tuple[datetime, str]] = []
        for m in self._date_re.finditer(text):
            raw = m.group(1)
            try:
                parsed = dateutil_parser.parse(raw, dayfirst=True, fuzzy=True, default=datetime(1, 1, 1))
            except (ValueError, OverflowError):
                continue
            if parsed.year == 1:  # dateutil couldn't actually resolve a year — skip, unreliable
                continue
            parsed_candidates.append((parsed, raw))

        if not parsed_candidates:
            return None, None

        if len(parsed_candidates) == 1:
            # Only one date found at all — best-effort guess based on
            # whether it's past or future, since there's nothing to compare
            # it against.
            parsed, raw = parsed_candidates[0]
            return (raw, None) if parsed <= datetime.now() else (None, raw)

        parsed_candidates.sort(key=lambda c: c[0])
        if len(parsed_candidates) > 2:
            logger.info(
                "Found %d date-like candidates, expected 2 — taking earliest as "
                "manufacturing and latest as expiry, middle ones ignored.",
                len(parsed_candidates),
            )
        mfg_date = parsed_candidates[0][1]
        expiry_date = parsed_candidates[-1][1]
        return mfg_date, expiry_date

    def _extract_net_quantity_geo(self, rows: list[list[dict]]) -> str | None:
        """'Net weight', 'net wt', 'net quantity', 'net qty' are all the SAME
        field — one unified keyword pattern, one output key. Anchored to the
        actual label's position (same box first, then neighbours) instead of
        scanning the whole text blindly, which risked grabbing an unrelated
        number from elsewhere on the pack (a nutrition table value, say)."""
        label_box = _find_label_box(rows, self._net_qty_keyword_re)
        if not label_box:
            return None
        for pattern in (self._qty_total_re, self._qty_re):
            same_box_match = pattern.search(label_box["text"])
            if same_box_match:
                return re.sub(r"\s+", "", same_box_match.group(1)).lower()
            hit = find_value_near_label(rows, label_box, pattern)
            if hit:
                return re.sub(r"\s+", "", hit).lower()
        # OCR-confusable fallback ('g' misread as '9') within the label's
        # own neighbourhood only, not the whole document.
        same_box_fallback = self._qty_ocr_confusable_re.search(label_box["text"])
        if same_box_fallback:
            return f"{same_box_fallback.group(1)}g"
        fallback_hit = find_value_near_label(rows, label_box, self._qty_ocr_confusable_re)
        if fallback_hit:
            return f"{fallback_hit}g"
        return None

    def extract(self, text: str, rows: list[list[dict]] | None = None) -> dict:
        out: dict = {}

        if rows:
            mrp_value = self._extract_mrp_geo(rows)
            if mrp_value:
                out["mrp"] = mrp_value

            net_qty_value = self._extract_net_quantity_geo(rows)
            if net_qty_value:
                out["net_quantity"] = net_qty_value

            batch_value = self._extract_batch_geo(rows)
            if batch_value:
                out["batch_number"] = batch_value
        else:
            logger.warning(
                "No row structure passed to extract() — mrp/net_quantity/batch "
                "extraction skipped (text-only fallback removed as unreliable)."
            )

        # Dates: classified by time direction (past vs future), not spatial
        # position. Tested correct across three separate real photos,
        # including cases where curved/warped packaging scrambled row
        # clustering enough to mis-associate a label with the wrong date —
        # this approach doesn't care about row position at all, so it isn't
        # vulnerable to that failure mode.
        mfg_date, expiry_date = self._extract_dates_by_time_direction(text)
        if mfg_date:
            out["manufacturing_date"] = mfg_date
        if expiry_date:
            out["expiry_date"] = expiry_date

        # net_quantity fallback if geometric search found nothing at all
        # (e.g. no rows available) — global text search, last resort only.
        if "net_quantity" not in out:
            m = self._qty_total_re.search(text) or self._qty_re.search(text)
            if m:
                out["net_quantity"] = re.sub(r"\s+", "", m.group(1)).lower()

        m = self._pin_re.search(text)
        if m:
            # Two alternatives in the pattern: split "XXX XXX"/"XXX-XXX"
            # format (groups 1+2) or plain contiguous 6 digits (group 3).
            out["pin_code"] = f"{m.group(1)}{m.group(2)}" if m.group(1) else m.group(3)
            pin_raw_match = m.group(0)  # keeps original spacing/hyphen, if any

        if "pin_code" in out:
            for line in text.splitlines():
                # Search using the ORIGINAL matched text (which may contain
                # a space/hyphen, e.g. "388 001"), not the normalized
                # pin_code value ("388001") — the normalized form often
                # won't appear verbatim in the source line at all, which
                # silently broke this address lookup before.
                if pin_raw_match in line:
                    out["address"] = line.strip()
                    break

        return out


class GLiNERExtractor:
    def __init__(self, model_name: str = "urchade/gliner_multi-v2.1", threshold: float = 0.4):
        from gliner import GLiNER
        self.model = GLiNER.from_pretrained(model_name)
        self.threshold = threshold

    def extract(self, text: str, rows: list[list[dict]] | None = None) -> dict:
        predictions = self.model.predict_entities(text, ENTITY_LABELS, threshold=self.threshold)
        by_key: dict[str, list[dict]] = {}
        for p in predictions:
            key = LABEL_TO_KEY.get(p["label"], p["label"].lower().replace(" ", "_"))
            by_key.setdefault(key, []).append(p)

        out: dict = {}
        for key, spans in by_key.items():
            if key != "manufacturing_date":
                best = max(spans, key=lambda s: s.get("score", 0))
                out[key] = best["text"]

        date_spans = by_key.get("manufacturing_date", [])
        if date_spans:
            mfg_kw = re.search(r"(?i)\b(?:pkd|pkg|mfg|mfd|manufactured|packed|packaging\s*date)\b", text)
            expiry_kw = re.search(r"(?i)\b(?:use\s*by|expiry|exp\.?|best\s*before)\b", text)

            def nearest_span(keyword_match):
                if not keyword_match:
                    return None
                return min(date_spans, key=lambda s: abs(s["start"] - keyword_match.start()))

            mfg_span = nearest_span(mfg_kw)
            expiry_span = nearest_span(expiry_kw)

            if mfg_span:
                out["manufacturing_date"] = mfg_span["text"]
            elif date_spans:
                out["manufacturing_date"] = max(date_spans, key=lambda s: s.get("score", 0))["text"]

            if expiry_span and (not mfg_span or expiry_span["text"] != mfg_span["text"]):
                out["expiry_date"] = expiry_span["text"]

        return out


def get_extractor() -> Extractor:
    # HARDCODED for now — GLiNER has underperformed regex on every real
    # photo tested so far. The environment-variable override kept not
    # taking effect in practice, so this guarantees regex runs regardless
    # of terminal/env-var state. To experiment with GLiNER again later,
    # comment out the next line.
    return RegexFallbackExtractor()

    import os

    forced = os.environ.get("FORCE_EXTRACTOR", "").strip().lower()
    if forced == "regex":
        logger.info("FORCE_EXTRACTOR=regex — using RegexFallbackExtractor explicitly.")
        return RegexFallbackExtractor()
    if forced == "gliner":
        logger.info("FORCE_EXTRACTOR=gliner — forcing GLiNERExtractor (will raise if unavailable).")
        return GLiNERExtractor()

    try:
        return GLiNERExtractor()
    except Exception as e:
        logger.warning(
            "GLiNER unavailable (%s) — falling back to RegexFallbackExtractor. "
            "Install `gliner` + `torch` and ensure model download access for production.",
            e,
        )
        return RegexFallbackExtractor()