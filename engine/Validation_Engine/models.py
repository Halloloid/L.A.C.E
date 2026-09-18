"""
API contract between the Rust gateway and this validation engine.

Rust owns: OCR call, blur/quality gate, deskewing, and the barcode-based
px -> mm scale calibration. By the time a request reaches this service,
every text field should already carry its physical font height in mm.

This service owns: entity extraction (GLiNER) + all rule checks
(MRP format, net-quantity format, date plausibility, address/PIN,
mandatory declaration phrases, font-height-vs-LMPC-tier), and produces
a single verdict per image.
"""

from __future__ import annotations
from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class CalibratedField(BaseModel):
    """One OCR text span, already deskewed and scale-calibrated by Rust."""
    field_hint: Optional[str] = Field(
        default=None,
        description="Optional hint from Rust if it already suspects the field type "
                    "(e.g. 'mrp_candidate'). Not authoritative — GLiNER makes the final call."
    )
    text: str
    font_height_mm: Optional[float] = Field(
        default=None,
        description="Physical character height in mm, derived from the barcode "
                    "scale factor. Null if this span had no reliable calibration "
                    "(e.g. off the barcode's plane)."
    )
    ocr_confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    bbox: Optional[List[float]] = Field(
        default=None, description="[x_min, y_min, x_max, y_max] in the deskewed image."
    )


class ValidationRequest(BaseModel):
    image_id: str
    raw_ocr_text: str = Field(..., description="Full concatenated OCR text, used for "
                                                 "declaration phrase fuzzy-matching.")
    mean_ocr_confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    px_to_mm_scale_factor: Optional[float] = Field(
        default=None,
        description="From the barcode ruler calibration. Included for audit/debug; "
                    "font_height_mm on each field is what's actually used to validate."
    )
    fields: List[CalibratedField] = Field(default_factory=list)


class FieldVerdict(BaseModel):
    field: str
    status: Literal["PASS", "WARNING", "FAIL", "MISSING"]
    reason: str
    extracted_value: Optional[str] = None


class ValidationResponse(BaseModel):
    image_id: str
    entities: dict = Field(default_factory=dict, description="field_name -> extracted text")
    field_verdicts: List[FieldVerdict]
    declaration_verdicts: List[FieldVerdict]
    font_size_verdicts: List[FieldVerdict]
    overall_verdict: Literal["PASS", "WARNING", "FAIL", "HUMAN_REVIEW"]
    compliance_score: float = Field(..., ge=0.0, le=1.0)
    notes: List[str] = Field(default_factory=list)
