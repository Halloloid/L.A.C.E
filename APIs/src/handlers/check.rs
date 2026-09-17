use axum::{extract::Multipart, http::StatusCode, response::Json};
use serde_json::{Value, json};
use tracing::error;

use crate::{models::check::CheckImageRequest, services::check::check_service};

pub async fn check_image(
    mut multipart: Multipart,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let request = extract_image_request(&mut multipart).await?;

    check_service(request)
        .await
        .map(|response| Json(json!(response)))
        .map_err(|error| {
            (
                StatusCode::UNPROCESSABLE_ENTITY,
                Json(json!({
                    "error": error.message()
                })),
            )
        })
}

async fn extract_image_request(
    multipart: &mut Multipart,
) -> Result<CheckImageRequest, (StatusCode, Json<Value>)> {
    let field = multipart
        .next_field()
        .await
        .map_err(|error| {
            error!(%error, "Failed to read multipart request");
            bad_request("Invalid multipart request")
        })?
        .ok_or_else(|| bad_request("An image file is required"))?;

    let filename = field
        .file_name()
        .map(str::to_owned)
        .ok_or_else(|| bad_request("The multipart upload must contain a file"))?;

    let content_type = field
        .content_type()
        .map(str::to_owned)
        .ok_or_else(|| bad_request("The uploaded file must include a content type"))?;

    let image = field.bytes().await.map_err(|error| {
        error!(%error, "Failed to read uploaded image");
        bad_request("Unable to read uploaded image")
    })?;

    Ok(CheckImageRequest {
        image: image.to_vec(),
        filename,
        content_type,
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
