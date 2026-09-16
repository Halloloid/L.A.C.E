use serde::Deserialize;
use validator::{Validate, ValidationError};

const MAX_IMAGE_SIZE_BYTES: usize = 10 * 1024 * 1024;

#[derive(Debug, Deserialize, Validate)]
pub struct CheckImageRequest {
    #[validate(length(min = 1, max = 10_485_760))]
    pub image: Vec<u8>,

    #[validate(length(min = 1, max = 255))]
    pub filename: String,

    #[validate(custom(function = "validate_image_content_type"))]
    pub content_type: String,
}

#[derive(Debug, serde::Serialize)]
pub struct CheckImageResponse {
    pub status: &'static str,
    pub filename: String,
    pub size_bytes: usize,
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
