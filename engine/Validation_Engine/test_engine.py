"""
Orchestrates: GLiNER extraction -> field validators (MRP, qty, date, address)
                                  -> declaration validator (RapidFuzz)
                                  -> font-size validator (uses Rust's mm calibration)
                                  -> decision rollup

This is the "DETERMINISTIC LEGAL VALIDATION ENGINE" box in your diagram.
Deterministic on purpose: given the same extracted entities and the same
rules.json, the verdict is always reproducible — GLiNER is the only
non-deterministic-ish step, and even that is threshold-gated.
"""

from __future__ import annotations
import json
from pathlib import Path

from models import ValidationRequest, ValidationResponse, FieldVerdict
from extractor import get_extractor, reconstruct_rows
from validators.mrp import validate_mrp
from validators.quantity import validate_net_quantity
from validators.date import validate_manufacturing_date
from validators.address import validate_address
from validators.declarations import validate_declarations
from validators.font_size import validate_font_sizes

RULES_PATH = Path(__file__).parent / "rules.json"


def load_rules() -> dict:
    with open(RULES_PATH, "r") as f:
        return json.load(f)


class ValidationEngine:
    def __init__(self):
        self.rules = load_rules()
        self.extractor = get_extractor()

    def reload_rules(self):
        """Hot-reload rules.json without restarting the service — handy when
        your team is still tuning thresholds during the hackathon."""
        self.rules = load_rules()

    def run(self, request: ValidationRequest) -> ValidationResponse:
        notes: list[str] = []

        if request.mean_ocr_confidence is not None and request.mean_ocr_confidence < 0.6:
            notes.append(
                f"Mean OCR confidence ({request.mean_ocr_confidence:.2f}) is low — "
                "results below are extracted from a shaky OCR read, treat verdict with caution."
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

        entities = self.extractor.extract(request.raw_ocr_text, rows=rows)

        field_verdicts: list[FieldVerdict] = [
            validate_mrp(entities, self.rules),
            validate_net_quantity(entities, self.rules),
            validate_manufacturing_date(entities, self.rules),
            validate_address(entities, self.rules),
        ]

    run_case("CASE 1 — expected PASS", sample_pass_case(), engine)
    run_case("CASE 2 — expected FAIL", sample_fail_case(), engine)
    run_case("CASE 3 — expected HUMAN_REVIEW (borderline font)", sample_warning_case(), engine)
    run_case("CASE 4 — expected PASS (spaced 'Net Weight : 500 g')", sample_spaced_quantity_case(), engine)
