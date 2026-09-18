import re
from models import FieldVerdict

_MRP_FORMAT_RE = re.compile(r"^\d+(\.\d{1,2})?$")


def validate_mrp(entities: dict, rules: dict) -> FieldVerdict:
    raw = entities.get("mrp")
    if not raw:
        return FieldVerdict(field="mrp", status="MISSING", reason="No MRP value detected in the image.")

    cleaned = raw.strip().replace(",", "")
    if not _MRP_FORMAT_RE.match(cleaned):
        return FieldVerdict(
            field="mrp", status="FAIL",
            reason=f"MRP value '{raw}' isn't a clean numeric price (expected e.g. 199 or 199.00).",
            extracted_value=raw,
        )

    value = float(cleaned)
    if value <= 0:
        return FieldVerdict(field="mrp", status="FAIL", reason="MRP must be greater than zero.",
                             extracted_value=raw)

    return FieldVerdict(field="mrp", status="PASS", reason="MRP present and correctly formatted.",
                         extracted_value=raw)
