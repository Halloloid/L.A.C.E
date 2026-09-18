from rapidfuzz import fuzz
from models import FieldVerdict


def validate_declarations(raw_ocr_text: str, rules: dict) -> list[FieldVerdict]:
    """For each mandatory-declaration group in rules.json, fuzzy-match every
    alias against the full OCR text and keep the best score. This is what
    absorbs OCR noise — 'Manufacfured by' still matches 'Manufactured by'."""
    results: list[FieldVerdict] = []
    text = raw_ocr_text.lower()

    for group in rules.get("mandatory_declarations", {}).get("groups", []):
        best_score = 0
        best_alias = None
        for alias in group["aliases"]:
            # partial_ratio because the phrase is usually a substring of a longer line
            score = fuzz.partial_ratio(alias.lower(), text)
            if score > best_score:
                best_score, best_alias = score, alias

        min_score = group.get("min_score", 80)
        severity = group.get("severity", "fail")  # what to report if it's missing

        if best_score >= min_score:
            results.append(FieldVerdict(
                field=group["id"], status="PASS",
                reason=f"Matched '{best_alias}' (score {best_score}).",
            ))
        else:
            results.append(FieldVerdict(
                field=group["id"],
                status="FAIL" if severity == "fail" else "WARNING",
                reason=f"'{group['label']}' not confidently found (best match score {best_score}, needed {min_score}).",
            ))

    return results
