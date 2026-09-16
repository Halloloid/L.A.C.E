use imageproc::{filter::filter_parallel, kernel::LAPLACIAN_3X3};
use nalgebra::DVector;
use validator::Validate;

use crate::models::check::{CheckImageRequest, CheckImageResponse};

const BLUR_VARIANCE_THRESHOLD: f64 = 100.0;

#[derive(Debug)]
pub enum CheckServiceError {
    Validation(validator::ValidationErrors),
    ImageProcessing(String),
}

impl CheckServiceError {
    pub fn message(&self) -> String {
        match self {
            Self::Validation(errors) => format!("Invalid image upload: {errors}"),
            Self::ImageProcessing(message) => message.clone(),
        }
    }
}

pub fn check_service(request: CheckImageRequest) -> Result<CheckImageResponse, CheckServiceError> {
    request.validate().map_err(CheckServiceError::Validation)?;

    let blur = is_image_blurred(&request.image)?;

    Ok(CheckImageResponse {
        status: "received",
        filename: request.filename,
        size_bytes: request.image.len(),
        blur,
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
