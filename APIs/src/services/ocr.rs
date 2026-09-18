use reqwest::{
    Client,
    multipart::{Form, Part},
};
use std::{sync::OnceLock, time::Duration};

use crate::models::ocr::OcrSpaceResponse;

const OCR_SPACE_ENDPOINT: &str = "https://api.ocr.space/parse/image";
const OCR_TIMEOUT_SECONDS: u64 = 30;
static OCR_CLIENT: OnceLock<Client> = OnceLock::new();

#[derive(Debug, thiserror::Error)]
pub enum OcrError {
    #[error("OCR_SPACE_API_KEY is not configured")]
    MissingApiKey,

    #[error("OCR.space request failed: {0}")]
    Request(#[from] reqwest::Error),

    #[error("OCR.space API returned an error: {0}")]
    Api(String),

    #[error("OCR.space returned no OCR text")]
    NoText,
}

pub async fn extract_text(
    image: &[u8],
    filename: &str,
    content_type: &str,
) -> Result<OcrSpaceResponse, OcrError> {
    let api_key = std::env::var("OCR_SPACE_API_KEY").map_err(|_| OcrError::MissingApiKey)?;

    let part = Part::bytes(image.to_vec())
        .file_name(filename.to_owned())
        .mime_str(content_type)
        .map_err(|error| OcrError::Api(format!("Invalid image content type: {error}")))?;

    let form = Form::new()
        .part("file", part)
        .text("language", "eng")
        .text("isOverlayRequired", "true")
        .text("detectOrientation", "true")
        .text("scale", "true")
        .text("OCREngine", "2");

    let response = ocr_client()
        .post(OCR_SPACE_ENDPOINT)
        .header("apikey", api_key)
        .multipart(form)
        .send()
        .await?;

    let status = response.status();
    let body = response.text().await?;

    if !status.is_success() {
        return Err(OcrError::Api(format!("HTTP {status}: {body}")));
    }

    let parsed = serde_json::from_str::<OcrSpaceResponse>(&body)
        .map_err(|error| OcrError::Api(format!("Invalid OCR.space response: {error}")))?;

    if parsed.is_errored_on_processing {
        return Err(OcrError::Api(format_error_message(
            parsed.error_message.as_ref(),
        )));
    }

    let has_text = parsed
        .parsed_results
        .iter()
        .any(|result| !result.parsed_text.trim().is_empty());

    if !has_text {
        return Err(OcrError::NoText);
    }

    Ok(parsed)
}

fn format_error_message(error: Option<&serde_json::Value>) -> String {
    match error {
        Some(serde_json::Value::String(message)) => message.clone(),
        Some(value) => value.to_string(),
        None => "OCR.space could not process the image".to_owned(),
    }
}

fn ocr_client() -> &'static Client {
    OCR_CLIENT.get_or_init(|| {
        Client::builder()
            .timeout(Duration::from_secs(OCR_TIMEOUT_SECONDS))
            .build()
            .expect("failed to construct OCR HTTP client")
    })
}
