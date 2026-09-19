use imageproc::{filter::filter_parallel, kernel::LAPLACIAN_3X3};
use nalgebra::DVector;
use validator::Validate;

use crate::models::check::{CheckImageRequest, CheckImageResponse, ScaleResponse};
use crate::services::geometry::calculate_scale;
use crate::services::text_order::reconstruct_reading_order;
use crate::services::validation::{self as validation_engine};
use crate::services::{
    geometry::calculate_word_geometry,
    ocr::{OcrError, extract_text},
};
use uuid::Uuid;

const BLUR_VARIANCE_THRESHOLD: f64 = 10.0;

#[derive(Debug)]
pub enum CheckServiceError {
    Validation(validator::ValidationErrors),
    ImageProcessing(String),
    Ocr(OcrError),
    Scale(String),
}

impl CheckServiceError {
    pub fn message(&self) -> String {
        match self {
            Self::Validation(errors) => format!("Invalid image upload: {errors}"),
            Self::ImageProcessing(message) => message.clone(),
            Self::Ocr(error) => format!("OCR processing failed: {error}"),
            Self::Scale(message) => format!("Scale calculation failed: {message}"),
        }
    }
}

pub async fn check_service(
    request: CheckImageRequest,
) -> Result<CheckImageResponse, CheckServiceError> {
    request.validate().map_err(CheckServiceError::Validation)?;

    let blur = is_image_blurred(&request.image)?;

    if blur {
        return Ok(CheckImageResponse {
            status: "blur_detected",
            filename: request.filename,
            size_bytes: request.image.len(),
            blur: true,
            message: "Image is blurry. Please capture or upload a clearer image.",
            ocr_text: None,
            ocr_ordered_text: None,
            ocr_data: None,
            geometry: None,
            scale: None,
            validation: None,
            validation_error: None,
        });
    }

    let ocr_data = extract_text(&request.image, &request.filename, &request.content_type)
        .await
        .map_err(CheckServiceError::Ocr)?;
    let ocr_text = ocr_data
        .parsed_results
        .iter()
        .map(|result| result.parsed_text.as_str())
        .filter(|text| !text.trim().is_empty())
        .collect::<Vec<_>>()
        .join("\n");
    let ocr_ordered_text = reconstruct_reading_order(&ocr_data);
    let geometry = calculate_word_geometry(&ocr_data);
    let scale = calculate_scale(
        &geometry,
        request.barcode_length_cm,
        &ocr_data,
    )
    .ok_or_else(|| {
        CheckServiceError::Scale(
            "OCR.space did not return barcode coordinates, so barcode pixel length cannot be calculated"
                .to_owned(),
        )
    })?;

    let raw_ocr_text_for_engine = ocr_ordered_text.clone().unwrap_or_else(|| ocr_text.clone());
    let validation_request = validation_engine::build_request(
        Uuid::new_v4().to_string(),
        raw_ocr_text_for_engine,
        &ocr_data,
        &scale,
    );
    let (validation, validation_error) =
        match validation_engine::validate(&validation_request).await {
            Ok(response) => (Some(response), None),
            Err(error) => (None, Some(error.to_string())),
        };

    Ok(CheckImageResponse {
        status: "received",
        filename: request.filename,
        size_bytes: request.image.len(),
        blur: false,
        message: "Image quality accepted and OCR completed.",
        ocr_text: Some(ocr_text),
        ocr_ordered_text,
        ocr_data: Some(ocr_data),
        geometry: Some(geometry),
        scale: Some(ScaleResponse {
            barcode_length_cm: scale.barcode_length_cm,
            barcode_length_px: scale.barcode_length_px,
            pixels_per_cm: scale.pixels_per_cm,
            calibration_source: scale.calibration_source,
            calibration_confidence: scale.calibration_confidence,
            word_measurements: scale.words,
        }),
        validation,
        validation_error,
    })
}

fn is_image_blurred(image_bytes: &[u8]) -> Result<bool, CheckServiceError> {
    let image = image::load_from_memory(image_bytes)
        .map_err(|error| {
            CheckServiceError::ImageProcessing(format!("Unable to decode image: {error}"))
        })?
        .to_luma8();

    let laplacian_image =
        filter_parallel::<_, i16, _, image::Luma<f32>>(&image, LAPLACIAN_3X3, |value| value as f32);
    let responses = DVector::from_iterator(
        laplacian_image.pixels().len(),
        laplacian_image.pixels().map(|pixel| f64::from(pixel[0])),
    );

    let mean = responses.sum() / responses.len() as f64;
    let centered = &responses - DVector::from_element(responses.len(), mean);
    let variance = centered.dot(&centered) / responses.len() as f64;

    Ok(variance < BLUR_VARIANCE_THRESHOLD)
}
