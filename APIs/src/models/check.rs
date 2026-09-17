use serde::Deserialize;
use validator::{Validate, ValidationError};

use super::geometry::{PhysicalWordMeasurement, WordGeometry};
use super::ocr::OcrSpaceResponse;

const MAX_IMAGE_SIZE_BYTES: usize = 10 * 1024 * 1024;

#[derive(Debug, Deserialize, Validate)]
pub struct CheckImageRequest {
    #[validate(length(min = 1, max = 10_485_760))]
    pub image: Vec<u8>,

    #[validate(length(min = 1, max = 255))]
    pub filename: String,

    #[validate(custom(function = "validate_image_content_type"))]
    pub content_type: String,

    #[validate(custom(function = "validate_positive_measurement"))]
    pub barcode_length_cm: f64,
}

#[derive(Debug, serde::Serialize)]
pub struct CheckImageResponse {
    pub status: &'static str,
    pub filename: String,
    pub size_bytes: usize,
    pub blur: bool,
    pub message: &'static str,
    pub ocr_text: Option<String>,
    pub ocr_data: Option<OcrSpaceResponse>,
    pub geometry: Option<Vec<WordGeometry>>,
    pub scale: Option<ScaleResponse>,
}

#[derive(Debug, serde::Serialize)]
pub struct ScaleResponse {
    pub barcode_length_cm: f64,
    pub barcode_length_px: f64,
    pub pixels_per_cm: f64,
    pub calibration_source: &'static str,
    pub calibration_confidence: &'static str,
    pub word_measurements: Vec<PhysicalWordMeasurement>,
}

pub fn validate_image_content_type(content_type: &str) -> Result<(), ValidationError> {
    const SUPPORTED_TYPES: [&str; 3] = ["image/jpeg", "image/png", "image/webp"];

    if SUPPORTED_TYPES.contains(&content_type) {
        Ok(())
    } else {
        Err(ValidationError::new("unsupported_image_type"))
    }
}

pub fn max_image_size_bytes() -> usize {
    MAX_IMAGE_SIZE_BYTES
}

pub fn validate_positive_measurement(value: f64) -> Result<(), ValidationError> {
    if value.is_finite() && value > 0.0 {
        Ok(())
    } else {
        Err(ValidationError::new("must_be_positive"))
    }
}
