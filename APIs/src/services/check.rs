use validator::Validate;

use crate::models::check::{CheckImageRequest, CheckImageResponse};

#[derive(Debug)]
pub enum CheckServiceError {
    Validation(validator::ValidationErrors),
}

impl CheckServiceError {
    pub fn message(&self) -> String {
        match self {
            Self::Validation(errors) => format!("Invalid image upload: {errors}"),
        }
    }
}

pub fn check_service(
    request: CheckImageRequest,
) -> Result<CheckImageResponse, CheckServiceError> {
    request
        .validate()
        .map_err(CheckServiceError::Validation)?;

    Ok(CheckImageResponse {
        status: "received",
        filename: request.filename,
        size_bytes: request.image.len(),
    })
}
