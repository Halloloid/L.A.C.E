use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
pub struct OcrSpaceResponse {
    #[serde(rename = "ParsedResults", default)]
    pub parsed_results: Vec<OcrSpaceParsedResult>,

    #[serde(rename = "OCRExitCode", default)]
    pub ocr_exit_code: Option<i32>,

    #[serde(rename = "IsErroredOnProcessing", default)]
    pub is_errored_on_processing: bool,

    #[serde(rename = "ErrorMessage", default)]
    pub error_message: Option<serde_json::Value>,

    #[serde(rename = "ProcessingTimeInMilliseconds", default)]
    pub processing_time_in_milliseconds: Option<serde_json::Value>,

    #[serde(rename = "SearchablePDFURL", default)]
    pub searchable_pdf_url: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct OcrSpaceParsedResult {
    #[serde(rename = "TextOverlay", default)]
    pub text_overlay: Option<OcrSpaceTextOverlay>,

    #[serde(rename = "FileParseExitCode", default)]
    pub file_parse_exit_code: Option<serde_json::Value>,

    #[serde(rename = "ParsedText", default)]
    pub parsed_text: String,

    #[serde(rename = "ErrorMessage", default)]
    pub error_message: Option<serde_json::Value>,

    #[serde(rename = "ErrorDetails", default)]
    pub error_details: Option<serde_json::Value>,

    #[serde(rename = "TextOrientation", default)]
    pub text_orientation: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct OcrSpaceTextOverlay {
    #[serde(rename = "Lines", default)]
    pub lines: Vec<OcrSpaceLine>,

    #[serde(rename = "HasOverlay", default)]
    pub has_overlay: bool,

    #[serde(rename = "Message", default)]
    pub message: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct OcrSpaceLine {
    #[serde(rename = "LineText", default)]
    pub line_text: String,

    #[serde(rename = "Words", default)]
    pub words: Vec<OcrSpaceWord>,

    #[serde(rename = "MaxHeight", default)]
    pub max_height: Option<i32>,

    #[serde(rename = "MinTop", default)]
    pub min_top: Option<i32>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct OcrSpaceWord {
    #[serde(rename = "WordText", default)]
    pub word_text: String,

    #[serde(rename = "Left", default)]
    pub left: Option<i32>,

    #[serde(rename = "Top", default)]
    pub top: Option<i32>,

    #[serde(rename = "Width", default)]
    pub width: Option<i32>,

    #[serde(rename = "Height", default)]
    pub height: Option<i32>,
}
