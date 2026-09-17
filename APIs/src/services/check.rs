use imageproc::{filter::filter_parallel, kernel::LAPLACIAN_3X3};
use nalgebra::DVector;
use validator::Validate;

use crate::models::check::{CheckImageRequest, CheckImageResponse};
use crate::services::{geometry::calculate_word_geometry, ocr::extract_text};

const BLUR_VARIANCE_THRESHOLD: f64 = 10.0;

#[derive(Debug)]
pub enum CheckServiceError {
    Validation(validator::ValidationErrors),
    ImageProcessing(String),
    Ocr(String),
}

impl CheckServiceError {
    pub fn message(&self) -> String {
        match self {
            Self::Validation(errors) => format!("Invalid image upload: {errors}"),
            Self::ImageProcessing(message) => message.clone(),
            Self::Ocr(message) => format!("OCR processing failed: {message}"),
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
            ocr_data: None,
            geometry: None,
        });
    }

    let ocr_data = extract_text(&request.image, &request.filename, &request.content_type)
        .await
        .map_err(|error| CheckServiceError::Ocr(error.to_string()))?;
    let ocr_text = ocr_data
        .parsed_results
        .iter()
        .map(|result| result.parsed_text.as_str())
        .filter(|text| !text.trim().is_empty())
        .collect::<Vec<_>>()
        .join("\n");
    let geometry = calculate_word_geometry(&ocr_data);

    Ok(CheckImageResponse {
        status: "received",
        filename: request.filename,
        size_bytes: request.image.len(),
        blur: false,
        message: "Image quality accepted and OCR completed.",
        ocr_text: Some(ocr_text),
        ocr_data: Some(ocr_data),
        geometry: Some(geometry),
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
