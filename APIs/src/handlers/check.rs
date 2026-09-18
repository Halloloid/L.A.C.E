use axum::{extract::Multipart, http::StatusCode, response::Json};
use serde_json::{Value, json};
use tracing::error;

use crate::{
    models::check::CheckImageRequest,
    services::{
        check::{CheckServiceError, check_service},
        ocr::OcrError,
    },
};

pub async fn check_image(
    mut multipart: Multipart,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let request = extract_image_request(&mut multipart).await?;

    check_service(request)
        .await
        .map(|response| Json(json!(response)))
        .map_err(|error| {
            (
                status_code_for_error(&error),
                Json(json!({
                    "error": error.message()
                })),
            )
        })
}

fn status_code_for_error(error: &CheckServiceError) -> StatusCode {
    match error {
        CheckServiceError::Validation(_)
        | CheckServiceError::ImageProcessing(_)
        | CheckServiceError::Scale(_) => StatusCode::UNPROCESSABLE_ENTITY,
        CheckServiceError::Ocr(ocr_error) => match ocr_error {
            OcrError::MissingApiKey => StatusCode::INTERNAL_SERVER_ERROR,
            OcrError::Request(_) | OcrError::Api(_) => StatusCode::BAD_GATEWAY,
            OcrError::NoText => StatusCode::UNPROCESSABLE_ENTITY,
        },
    }
}

async fn extract_image_request(
    multipart: &mut Multipart,
) -> Result<CheckImageRequest, (StatusCode, Json<Value>)> {
    let mut image = None;
    let mut filename = None;
    let mut content_type = None;
    let mut barcode_length_cm = None;

    while let Some(field) = multipart.next_field().await.map_err(|error| {
        error!(%error, "Failed to read multipart request");
        bad_request("Invalid multipart request")
    })? {
        let field_name = field.name().map(str::to_owned);

        match field_name.as_deref() {
            Some("image") => {
                filename = field.file_name().map(str::to_owned);
                content_type = field.content_type().map(str::to_owned);
                image = Some(
                    field
                        .bytes()
                        .await
                        .map_err(|error| {
                            error!(%error, "Failed to read uploaded image");
                            bad_request("Unable to read uploaded image")
                        })?
                        .to_vec(),
                );
            }
            Some("barcode_length_cm") => {
                barcode_length_cm = Some(parse_measurement(field, "barcode_length_cm").await?);
            }
            _ => {}
        }
    }

    Ok(CheckImageRequest {
        image: image.ok_or_else(|| bad_request("Missing image field"))?,
        filename: filename.ok_or_else(|| bad_request("Image filename is required"))?,
        content_type: content_type.ok_or_else(|| bad_request("Image content type is required"))?,
        barcode_length_cm: barcode_length_cm
            .ok_or_else(|| bad_request("Missing barcode_length_cm field"))?,
    })
}

async fn parse_measurement(
    field: axum::extract::multipart::Field<'_>,
    field_name: &'static str,
) -> Result<f64, (StatusCode, Json<Value>)> {
    let value = field.text().await.map_err(|error| {
        error!(%error, field = field_name, "Failed to read measurement field");
        bad_request("Unable to read measurement field")
    })?;

    value.parse::<f64>().map_err(|error| {
        error!(%error, field = field_name, value = %value, "Invalid measurement value");
        bad_request("Measurement fields must contain numbers")
    })
}

fn bad_request(message: &'static str) -> (StatusCode, Json<Value>) {
    (
        StatusCode::BAD_REQUEST,
        Json(json!({
            "error": message
        })),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_ocr_missing_api_key_to_500() {
        let error = CheckServiceError::Ocr(OcrError::MissingApiKey);
        assert_eq!(status_code_for_error(&error), StatusCode::INTERNAL_SERVER_ERROR);
    }

    #[test]
    fn maps_ocr_api_errors_to_502() {
        let error = CheckServiceError::Ocr(OcrError::Api("upstream error".to_owned()));
        assert_eq!(status_code_for_error(&error), StatusCode::BAD_GATEWAY);
    }

    #[test]
    fn keeps_validation_style_errors_as_422() {
        let error = CheckServiceError::Scale("missing barcode coordinates".to_owned());
        assert_eq!(status_code_for_error(&error), StatusCode::UNPROCESSABLE_ENTITY);
    }
}
