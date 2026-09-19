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

        # Build the geometric row structure from calibrated fields that
        # actually have a bounding box — Rust should always provide one, but
        # guard against it being absent (None) rather than crashing, since a
        # field with no geometry simply can't take part in row clustering.
        fields_as_dicts = [f.model_dump() for f in request.fields if f.bbox is not None]
        rows = reconstruct_rows(fields_as_dicts) if fields_as_dicts else []

        entities = self.extractor.extract(request.raw_ocr_text, rows=rows)

        field_verdicts: list[FieldVerdict] = [
            validate_mrp(entities, self.rules),
            validate_net_quantity(entities, self.rules),
            validate_manufacturing_date(entities, self.rules),
            validate_address(entities, self.rules),
        ]

        declaration_verdicts = validate_declarations(request.raw_ocr_text, self.rules)
        font_verdicts = validate_font_sizes(entities, request.fields, self.rules)

        overall, score = self._decide(field_verdicts, declaration_verdicts, font_verdicts)

        return ValidationResponse(
            image_id=request.image_id,
            entities=entities,
            field_verdicts=field_verdicts,
            declaration_verdicts=declaration_verdicts,
            font_size_verdicts=font_verdicts,
            overall_verdict=overall,
            compliance_score=score,
            notes=notes,
        )

    @staticmethod
    def _decide(
        field_verdicts: list[FieldVerdict],
        declaration_verdicts: list[FieldVerdict],
        font_verdicts: list[FieldVerdict],
    ) -> tuple[str, float]:
        all_verdicts = field_verdicts + declaration_verdicts + font_verdicts

        statuses = [v.status for v in all_verdicts]
        total = len(statuses) or 1
        passed = statuses.count("PASS")
        score = round(passed / total, 3)

        has_fail = "FAIL" in statuses
        has_missing = "MISSING" in statuses
        has_warning = "WARNING" in statuses

        # Hard fail: any critical FAIL or MISSING -> straight to FAIL, no ambiguity.
        if has_fail or has_missing:
            return "FAIL", score

        # Borderline: everything technically present but something's marginal
        # (e.g. font just under threshold, a soft declaration missing) -> route
        # to a human inspector rather than auto-deciding either way.
        if has_warning:
            return "HUMAN_REVIEW", score

        return "PASS", score