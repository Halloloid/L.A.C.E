from models import FieldVerdict, CalibratedField
from validators.quantity import normalized_quantity_in_base_units


def _required_min_mm(base_qty: float | None, rules: dict) -> float:
    tiers = rules.get("font_height_tiers_mm", {}).get("tiers", [])
    if base_qty is None:
        # unknown package size — be conservative and require the strictest small-pack tier
        return tiers[0]["min_font_height_mm"] if tiers else 1.0
    for tier in tiers:
        cap = tier["max_quantity_g_or_ml"]
        if cap is None or base_qty <= cap:
            return tier["min_font_height_mm"]
    return tiers[-1]["min_font_height_mm"] if tiers else 1.0


def _normalize(s: str) -> str:
    """Strip all whitespace and lowercase for tolerant substring matching.
    Handles the gap between normalized extracted values (e.g. '500g') and
    raw OCR spans that may contain spaces ('Net Wt: 500 g')."""
    return s.replace(" ", "").replace("\t", "").lower()


def _find_field_for(text_fragment: str | None, fields: list[CalibratedField]) -> CalibratedField | None:
    if not text_fragment:
        return None
    norm_frag = _normalize(text_fragment)
    for f in fields:
        if norm_frag in _normalize(f.text):
            return f
    return None


def validate_font_sizes(entities: dict, fields: list[CalibratedField], rules: dict) -> list[FieldVerdict]:
    """Font-height rules apply to the MRP and net-quantity declarations specifically.
    Rust has already converted px -> mm per span using the barcode scale factor;
    this validator just applies the LMPC tier lookup and compares."""
    results: list[FieldVerdict] = []
    base_qty = normalized_quantity_in_base_units(entities)
    required_mm = _required_min_mm(base_qty, rules)
    tolerance = rules.get("font_height_tiers_mm", {}).get("warning_tolerance_ratio", 0.9)

    for label, entity_key in (("mrp", "mrp"), ("net_quantity", "net_quantity")):
        field = _find_field_for(entities.get(entity_key), fields)

        if field is None:
            results.append(FieldVerdict(
                field=f"{label}_font_height", status="MISSING",
                reason=f"Couldn't locate the calibrated text span for {label} to measure font height.",
            ))
            continue

        if field.font_height_mm is None:
            results.append(FieldVerdict(
                field=f"{label}_font_height", status="WARNING",
                reason=f"{label} text found but had no reliable mm calibration "
                       f"(likely off the barcode's plane) — flag for manual measurement.",
                extracted_value=field.text,
            ))
            continue

        measured = field.font_height_mm
        if measured >= required_mm:
            results.append(FieldVerdict(
                field=f"{label}_font_height", status="PASS",
                reason=f"{measured:.2f}mm meets the {required_mm}mm minimum for this package size.",
                extracted_value=f"{measured:.2f}mm",
            ))
        elif measured >= required_mm * tolerance:
            results.append(FieldVerdict(
                field=f"{label}_font_height", status="WARNING",
                reason=f"{measured:.2f}mm is just under the {required_mm}mm minimum — borderline, worth a manual check.",
                extracted_value=f"{measured:.2f}mm",
            ))
        else:
            results.append(FieldVerdict(
                field=f"{label}_font_height", status="FAIL",
                reason=f"{measured:.2f}mm is below the {required_mm}mm minimum required for this package size.",
                extracted_value=f"{measured:.2f}mm",
            ))

    return results
