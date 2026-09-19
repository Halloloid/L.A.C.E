//! Client for the LMPC Validation Engine (the Python microservice under
//! `engine/Validation_Engine`).
//!
//! Rust's job stops at: OCR, blur/quality gating, deskewing, and
//! barcode-based px -> mm calibration. This module packages those results
//! into the engine's documented contract (`Validation_Engine/models.py`)
//! and calls its `/validate` endpoint. Entity extraction (GLiNER) and all
//! rule checks (MRP, quantity, dates, address, declarations, font size)
//! live entirely on the Python side — this module must not duplicate any
//! of that logic, only transport data to it.

use std::{sync::OnceLock, time::Duration};

use reqwest::Client;

use crate::models::{
    geometry::ScaleCalculation,
    ocr::OcrSpaceResponse,
    validation::{CalibratedField, ValidationRequest, ValidationResponse},
};

const DEFAULT_VALIDATION_ENGINE_URL: &str = "http://127.0.0.1:8001";
const VALIDATION_TIMEOUT_SECONDS: u64 = 20;
static VALIDATION_CLIENT: OnceLock<Client> = OnceLock::new();

#[derive(Debug, thiserror::Error)]
pub enum ValidationEngineError {
    #[error("validation engine request failed: {0}")]
    Request(#[from] reqwest::Error),

    #[error("validation engine returned an error: {0}")]
    Api(String),
}

/// Builds the exact request body the Python engine expects, from data Rust
/// has already computed earlier in the pipeline.
///
/// `raw_ocr_text` should be the best available reading-order text (prefer
/// `ocr_ordered_text` from `services::text_order`, falling back to the raw
/// `ocr_text` join when no overlay coordinates were available) — it feeds
/// both RapidFuzz declaration matching and GLiNER's extraction context.
///
/// Each OCR line (not individual word) becomes one `CalibratedField`, using
/// the line's tallest word as its font height. Using whole lines rather
/// than single words gives the engine's substring-based field lookup
/// (`_find_field_for` in `validators/font_size.py`) a realistic chance of
/// matching a multi-character extracted value like a price or date.
pub fn build_request(
    image_id: String,
    raw_ocr_text: String,
    ocr_data: &OcrSpaceResponse,
    scale: &ScaleCalculation,
) -> ValidationRequest {
    let mm_per_px = 10.0 / scale.pixels_per_cm;

    let fields = ocr_data
        .parsed_results
        .iter()
        .filter_map(|result| result.text_overlay.as_ref())
        .flat_map(|overlay| overlay.lines.iter())
        .filter_map(|line| {
            if line.line_text.trim().is_empty() {
                return None;
            }

            let max_height_px = line.max_height.map(f64::from).or_else(|| {
                line.words
                    .iter()
                    .filter_map(|word| word.height)
                    .map(f64::from)
                    .reduce(f64::max)
            });

            Some(CalibratedField {
                field_hint: None,
                text: line.line_text.clone(),
                font_height_mm: max_height_px.map(|height| height * mm_per_px),
                ocr_confidence: None,
                bbox: None,
            })
        })
        .collect();

    ValidationRequest {
        image_id,
        raw_ocr_text,
        // OCR.space's free-tier response doesn't expose a per-word or
        // overall confidence score in the models this service parses, so
        // there is nothing honest to put here yet. Sending `None` (rather
        // than fabricating a number) means the engine's low-confidence
        // warning simply won't fire, instead of firing on a made-up value.
        mean_ocr_confidence: None,
        px_to_mm_scale_factor: Some(mm_per_px),
        fields,
    }
}

pub async fn validate(
    request: &ValidationRequest,
) -> Result<ValidationResponse, ValidationEngineError> {
    let base_url = std::env::var("VALIDATION_ENGINE_URL")
        .unwrap_or_else(|_| DEFAULT_VALIDATION_ENGINE_URL.to_owned());
    let url = format!("{}/validate", base_url.trim_end_matches('/'));

    let response = validation_client().post(url).json(request).send().await?;

    let status = response.status();
    let body = response.text().await?;

    if !status.is_success() {
        return Err(ValidationEngineError::Api(format!("HTTP {status}: {body}")));
    }

    serde_json::from_str::<ValidationResponse>(&body).map_err(|error| {
        ValidationEngineError::Api(format!("Invalid validation engine response: {error}"))
    })
}

fn validation_client() -> &'static Client {
    VALIDATION_CLIENT.get_or_init(|| {
        Client::builder()
            .timeout(Duration::from_secs(VALIDATION_TIMEOUT_SECONDS))
            .build()
            .expect("failed to construct validation engine HTTP client")
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::ocr::{
        OcrSpaceLine, OcrSpaceParsedResult, OcrSpaceTextOverlay, OcrSpaceWord,
    };

    fn word(text: &str, height: i32) -> OcrSpaceWord {
        OcrSpaceWord {
            word_text: text.to_owned(),
            left: Some(0),
            top: Some(0),
            width: Some(10),
            height: Some(height),
        }
    }

    fn scale_with_pixels_per_cm(pixels_per_cm: f64) -> ScaleCalculation {
        ScaleCalculation {
            barcode_length_cm: 3.5,
            barcode_length_px: 276.0,
            pixels_per_cm,
            calibration_source: "barcode_number_coordinates",
            calibration_confidence: "measured",
            words: Vec::new(),
        }
    }

    #[test]
    fn converts_line_height_to_font_height_mm_using_the_scale_factor() {
        let ocr_data = OcrSpaceResponse {
            parsed_results: vec![OcrSpaceParsedResult {
                text_overlay: Some(OcrSpaceTextOverlay {
                    lines: vec![OcrSpaceLine {
                        line_text: "MRP Rs. 40.00".to_owned(),
                        words: vec![word("MRP", 40)],
                        max_height: Some(40),
                        min_top: Some(100),
                    }],
                    has_overlay: true,
                    message: None,
                }),
                file_parse_exit_code: None,
                parsed_text: String::new(),
                error_message: None,
                error_details: None,
                text_orientation: None,
                barcodes: Vec::new(),
            }],
            ocr_exit_code: None,
            is_errored_on_processing: false,
            error_message: None,
            processing_time_in_milliseconds: None,
            searchable_pdf_url: None,
        };

        // 78.857 px/cm ~= 7.8857 px/mm, so 1mm = 10/78.857 px_to_mm factor.
        let scale = scale_with_pixels_per_cm(78.857);
        let request = build_request(
            "test-image".to_owned(),
            "MRP Rs. 40.00".to_owned(),
            &ocr_data,
            &scale,
        );

        assert_eq!(request.fields.len(), 1);
        let field = &request.fields[0];
        assert_eq!(field.text, "MRP Rs. 40.00");

        let expected_mm = 40.0 * (10.0 / 78.857);
        let actual_mm = field.font_height_mm.expect("font height should be set");
        assert!(
            (actual_mm - expected_mm).abs() < 1e-6,
            "expected {expected_mm}, got {actual_mm}"
        );
    }

    #[test]
    fn skips_blank_lines() {
        let ocr_data = OcrSpaceResponse {
            parsed_results: vec![OcrSpaceParsedResult {
                text_overlay: Some(OcrSpaceTextOverlay {
                    lines: vec![OcrSpaceLine {
                        line_text: "   ".to_owned(),
                        words: vec![],
                        max_height: None,
                        min_top: None,
                    }],
                    has_overlay: true,
                    message: None,
                }),
                file_parse_exit_code: None,
                parsed_text: String::new(),
                error_message: None,
                error_details: None,
                text_orientation: None,
                barcodes: Vec::new(),
            }],
            ocr_exit_code: None,
            is_errored_on_processing: false,
            error_message: None,
            processing_time_in_milliseconds: None,
            searchable_pdf_url: None,
        };

        let scale = scale_with_pixels_per_cm(78.857);
        let request = build_request("test-image".to_owned(), String::new(), &ocr_data, &scale);

        assert!(request.fields.is_empty());
    }
}
