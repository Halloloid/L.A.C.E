import re
from models import FieldVerdict

_QTY_RE = re.compile(r"^(\d+(?:\.\d+)?)\s*(kg|g|gm|mg|ml|l)$", re.IGNORECASE)


def validate_net_quantity(entities: dict, rules: dict) -> FieldVerdict:
    raw = entities.get("net_quantity")
    if not raw:
        return FieldVerdict(field="net_quantity", status="MISSING",
                             reason="No net quantity declaration detected.")

    cleaned = raw.strip().replace(" ", "")
    m = _QTY_RE.match(cleaned)
    if not m:
        return FieldVerdict(
            field="net_quantity", status="FAIL",
            reason=f"'{raw}' doesn't match a standard unit format (e.g. 500g, 1L, 250ml).",
            extracted_value=raw,
        )

    value, unit = float(m.group(1)), m.group(2).lower()
    allowed = [u.lower() for u in rules.get("net_quantity", {}).get("allowed_units", [])]
    if unit not in allowed:
        return FieldVerdict(field="net_quantity", status="WARNING",
                             reason=f"Unit '{unit}' is unusual — confirm it's a standard LMPC unit.",
                             extracted_value=raw)
    if value <= 0:
        return FieldVerdict(field="net_quantity", status="FAIL", reason="Declared quantity must be positive.",
                             extracted_value=raw)

    return FieldVerdict(field="net_quantity", status="PASS", reason="Net quantity present and correctly formatted.",
                         extracted_value=raw)


def normalized_quantity_in_base_units(entities: dict) -> float | None:
    """Returns quantity converted to grams-or-ml equivalent, for font-height tier lookup."""
    raw = entities.get("net_quantity")
    if not raw:
        return None
    m = _QTY_RE.match(raw.strip().replace(" ", ""))
    if not m:
        return None
    value, unit = float(m.group(1)), m.group(2).lower()
    if unit == "kg":
        return value * 1000
    if unit == "l":
        return value * 1000
    if unit == "mg":
        return value / 1000
    return value  # g, gm, ml already in base units
