import re
from models import FieldVerdict

_PIN_RE = re.compile(r"\b[1-9][0-9]{5}\b")


def validate_address(entities: dict, rules: dict) -> FieldVerdict:
    address = entities.get("address")
    pin = entities.get("pin_code")

    if not address and not pin:
        return FieldVerdict(field="address", status="MISSING",
                             reason="No address or PIN code detected.")

    if not pin:
        # last chance: look for a 6-digit PIN inside the address text itself
        m = _PIN_RE.search(address or "")
        if m:
            pin = m.group(0)

    if not pin:
        return FieldVerdict(field="address", status="FAIL",
                             reason="Address found but no valid 6-digit PIN code detected.",
                             extracted_value=address)

    if not _PIN_RE.fullmatch(pin):
        return FieldVerdict(field="address", status="FAIL",
                             reason=f"'{pin}' is not a valid 6-digit Indian PIN code.",
                             extracted_value=address)

    if not address or len(address.strip()) < 8:
        return FieldVerdict(field="address", status="WARNING",
                             reason="PIN code found but surrounding address text looks incomplete — worth a human check.",
                             extracted_value=address or pin)

    return FieldVerdict(field="address", status="PASS",
                         reason="Address and valid PIN code present.", extracted_value=address)
