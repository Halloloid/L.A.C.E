use serde::{Deserialize, Serialize};
use serde_json::Value;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Inspection {
    pub id: String,
    pub date: String,
    pub inspector: String,
    pub category: String,
    pub product: ProductSummary,
    pub declarations: Declarations,
    pub measurement: Option<Measurement>,
    pub rules: Vec<RuleResult>,
    pub summary: InspectionSummary,
    pub status: InspectionStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductSummary {
    pub name: String,
    pub brand: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Declarations {
    pub brand: Option<String>,
    #[serde(rename = "productName")]
    pub product_name: Option<String>,
    pub tagline: Option<String>,
    pub manufacturer: Option<String>,
    #[serde(rename = "netQuantity")]
    pub net_quantity: Option<String>,
    pub mrp: Option<String>,
    #[serde(rename = "mfgDate")]
    pub manufacturing_date: Option<String>,
    pub consumer_care: Option<String>,
    pub batch: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Measurement {
    #[serde(rename = "referenceMm")]
    pub reference_mm: f64,
    #[serde(rename = "scaleMmPerPx")]
    pub scale_mm_per_px: f64,
    #[serde(rename = "detectedTextPx")]
    pub detected_text_px: f64,
    #[serde(rename = "physicalTextMm")]
    pub physical_text_mm: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleResult {
    pub status: RuleStatus,
    pub extracted: Option<String>,
    pub note: Option<String>,
    #[serde(flatten)]
    pub details: Option<Value>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RuleStatus {
    Pass,
    Warning,
    Fail,
    Missing,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum InspectionStatus {
    Processing,
    Compliant,
    Warning,
    Noncompliant,
    Failed,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct InspectionSummary {
    pub passed: u32,
    pub warnings: u32,
    pub failed: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InspectionListItem {
    pub id: String,
    pub date: String,
    pub inspector: String,
    pub category: String,
    pub product: ProductSummary,
    pub summary: InspectionSummary,
    pub status: InspectionStatus,
}

#[derive(Debug, Deserialize)]
pub struct CalibrationRequest {
    #[serde(rename = "referenceMm")]
    pub reference_mm: f64,
    #[serde(rename = "pixelLength")]
    pub pixel_length: f64,
}

#[derive(Debug, Serialize)]
pub struct InspectionCreated {
    pub id: String,
    pub status: InspectionStatus,
}

#[derive(Debug, Serialize)]
pub struct InspectionStatusResponse {
    pub id: String,
    pub status: InspectionStatus,
    pub stage: String,
}

#[derive(Debug, Serialize)]
pub struct Product {
    pub id: Uuid,
    pub name: String,
    pub brand: Option<String>,
    pub category: Option<String>,
}
