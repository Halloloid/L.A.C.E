"""
Quick smoke tests using realistic-looking OCR output. Run with:
    python test_engine.py

Not pytest-formatted on purpose — this is meant to be readable output your
team can eyeball during the hackathon, not a CI gate.
"""

import json
from models import ValidationRequest, CalibratedField
from engine import ValidationEngine


def sample_pass_case() -> ValidationRequest:
    raw_text = (
        "Manufactured by ABC Foods Pvt Ltd, Plot 12 Industrial Area, Pune 411001 "
        "MRP Rs 199.00 inclusive of all taxes "
        "Net Wt: 500g "
        "Mfg Date: 03/2025 "
        "Consumer Care: 1800-123-4567 "
        "Country of Origin: India"
    )
    return ValidationRequest(
        image_id="demo-pass-001",
        raw_ocr_text=raw_text,
        mean_ocr_confidence=0.91,
        px_to_mm_scale_factor=0.264,
        fields=[
            CalibratedField(field_hint="mrp_candidate", text="MRP Rs 199.00", font_height_mm=2.3, ocr_confidence=0.93),
            CalibratedField(field_hint="qty_candidate", text="Net Wt: 500g", font_height_mm=2.1, ocr_confidence=0.90),
        ],
    )


def sample_fail_case() -> ValidationRequest:
    # blurry photo, missing declarations, undersized font
    raw_text = "MRP 99 Net Wt 50g"
    return ValidationRequest(
        image_id="demo-fail-002",
        raw_ocr_text=raw_text,
        mean_ocr_confidence=0.42,
        px_to_mm_scale_factor=0.264,
        fields=[
            CalibratedField(field_hint="mrp_candidate", text="MRP 99", font_height_mm=0.6, ocr_confidence=0.5),
            CalibratedField(field_hint="qty_candidate", text="Net Wt 50g", font_height_mm=0.6, ocr_confidence=0.5),
        ],
    )


def sample_warning_case() -> ValidationRequest:
    # everything present, font just barely under threshold -> should route to human review
    raw_text = (
        "Manufactured by XYZ Pvt Ltd, 45 Market Road, Kolkata 700016 "
        "MRP Rs 45.00 inclusive of all taxes "
        "Net Wt: 100g "
        "Mfg Date: 06/2025"
    )
    return ValidationRequest(
        image_id="demo-warning-003",
        raw_ocr_text=raw_text,
        mean_ocr_confidence=0.85,
        px_to_mm_scale_factor=0.264,
        fields=[
            CalibratedField(field_hint="mrp_candidate", text="MRP Rs 45.00", font_height_mm=0.95, ocr_confidence=0.88),
            CalibratedField(field_hint="qty_candidate", text="Net Wt: 100g", font_height_mm=0.97, ocr_confidence=0.88),
        ],
    )


def sample_spaced_quantity_case() -> ValidationRequest:
    """Regression guard: real OCR often emits 'Net Weight : 500 g' with spaces
    around the value. The extractor normalizes to '500g', so the font-size
    lookup must tolerate whitespace differences between the extracted value
    and the raw OCR span."""
    raw_text = (
        "Manufactured by ABC Foods Pvt Ltd, Plot 12 Industrial Area, Pune 411001 "
        "MRP (incl. of all taxes) Rs 199.00 "
        "Net Weight : 500 g "
        "Mfg Date: 03/2025 "
        "Consumer Care: 1800-123-4567 "
        "Country of Origin: India"
    )
    return ValidationRequest(
        image_id="demo-spaced-qty-004",
        raw_ocr_text=raw_text,
        mean_ocr_confidence=0.88,
        px_to_mm_scale_factor=0.264,
        fields=[
            CalibratedField(field_hint="mrp_candidate", text="MRP (incl. of all taxes) Rs 199.00", font_height_mm=2.3, ocr_confidence=0.90),
            CalibratedField(field_hint="qty_candidate", text="Net Weight : 500 g", font_height_mm=2.1, ocr_confidence=0.89),
        ],
    )


def run_case(name: str, req: ValidationRequest, engine: ValidationEngine):
    print(f"\n{'=' * 60}\n{name}\n{'=' * 60}")
    result = engine.run(req)
    print(json.dumps(result.model_dump(), indent=2))
    print(f"\n>>> OVERALL VERDICT: {result.overall_verdict}  (score={result.compliance_score})")


if __name__ == "__main__":
    engine = ValidationEngine()
    print(f"Extractor in use: {type(engine.extractor).__name__}")

    run_case("CASE 1 — expected PASS", sample_pass_case(), engine)
    run_case("CASE 2 — expected FAIL", sample_fail_case(), engine)
    run_case("CASE 3 — expected HUMAN_REVIEW (borderline font)", sample_warning_case(), engine)
    run_case("CASE 4 — expected PASS (spaced 'Net Weight : 500 g')", sample_spaced_quantity_case(), engine)
