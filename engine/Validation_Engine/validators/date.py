from datetime import datetime
from dateutil import parser as dateparser
from models import FieldVerdict


def validate_manufacturing_date(entities: dict, rules: dict) -> FieldVerdict:
    raw = entities.get("manufacturing_date")
    if not raw:
        return FieldVerdict(field="manufacturing_date", status="MISSING",
                             reason="No manufacturing date detected.")

    try:
        parsed = dateparser.parse(raw, dayfirst=True, fuzzy=True, default=datetime(1, 1, 1))
    except (ValueError, OverflowError):
        return FieldVerdict(field="manufacturing_date", status="FAIL",
                             reason=f"'{raw}' couldn't be parsed as a valid date.",
                             extracted_value=raw)

    now = datetime.now()
    if parsed > now:
        return FieldVerdict(field="manufacturing_date", status="FAIL",
                             reason=f"Manufacturing date '{raw}' is in the future.",
                             extracted_value=raw)

    max_age = rules.get("manufacturing_date", {}).get("max_age_years_warning", 3)
    age_years = (now - parsed).days / 365.25
    if age_years > max_age:
        return FieldVerdict(field="manufacturing_date", status="WARNING",
                             reason=f"Manufacturing date '{raw}' is over {max_age} years old — verify it's genuinely still on-shelf stock, not a misread.",
                             extracted_value=raw)

    return FieldVerdict(field="manufacturing_date", status="PASS",
                         reason="Manufacturing date present and plausible.", extracted_value=raw)
