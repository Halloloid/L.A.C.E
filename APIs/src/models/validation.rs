//! Rust mirror of the LMPC Validation Engine's API contract
//! (`engine/Validation_Engine/models.py`).
//!
//! Field names and shapes here must stay in lockstep with that Python
//! service — this is the Rust <-> Python boundary described in
//! `Validation_Engine/README.md`.

use std::collections::HashMap;

use serde::{Deserialize, Serialize};

/// One OCR text span, already deskewed and scale-calibrated by Rust.
///
/// Mirrors `models.CalibratedField` in the Python engine.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CalibratedField {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub field_hint: Option<String>,

    pub text: String,

    /// Physical character height in mm, derived from the barcode scale
    /// factor. `None` if this span had no reliable calibration.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub font_height_mm: Option<f64>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub ocr_confidence: Option<f64>,

    /// `[x_min, y_min, x_max, y_max]` in the deskewed image.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bbox: Option<[f64; 4]>,
}

/// Mirrors `models.ValidationRequest`. This is the exact body Rust POSTs to
/// `/validate` on the Python engine.
#[derive(Debug, Clone, Serialize)]
pub struct ValidationRequest {
    pub image_id: String,

    /// Full concatenated OCR text, used for declaration phrase
    /// fuzzy-matching and as GLiNER's extraction context.
    pub raw_ocr_text: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub mean_ocr_confidence: Option<f64>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub px_to_mm_scale_factor: Option<f64>,

    pub fields: Vec<CalibratedField>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum VerdictStatus {
    Pass,
    Warning,
    Fail,
    Missing,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum OverallVerdict {
    Pass,
    Warning,
    Fail,
    HumanReview,
}

/// Mirrors `models.FieldVerdict`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldVerdict {
    pub field: String,
    pub status: VerdictStatus,
    pub reason: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub extracted_value: Option<String>,
}

/// Mirrors `models.ValidationResponse` — the body the Python engine returns
/// from a successful `/validate` call.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResponse {
    pub image_id: String,

    #[serde(default)]
    pub entities: HashMap<String, String>,

    pub field_verdicts: Vec<FieldVerdict>,
    pub declaration_verdicts: Vec<FieldVerdict>,
    pub font_size_verdicts: Vec<FieldVerdict>,
    pub overall_verdict: OverallVerdict,
    pub compliance_score: f64,

    #[serde(default)]
    pub notes: Vec<String>,
}
