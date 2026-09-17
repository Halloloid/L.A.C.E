use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct Point {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct BoundingBox {
    pub top_left: Point,
    pub top_right: Point,
    pub bottom_right: Point,
    pub bottom_left: Point,
}

#[derive(Debug, Clone, Serialize)]
pub struct WordGeometry {
    pub text: String,
    pub angle_degrees: f64,
    pub center: Point,
    pub original_box: BoundingBox,
    pub deskewed_box: BoundingBox,
}

#[derive(Debug, Clone, Serialize)]
pub struct PhysicalWordMeasurement {
    pub text: String,
    pub width_cm: f64,
    pub height_cm: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct ScaleCalculation {
    pub barcode_length_cm: f64,
    pub barcode_length_px: f64,
    pub pixels_per_cm: f64,
    pub calibration_source: &'static str,
    pub calibration_confidence: &'static str,
    pub words: Vec<PhysicalWordMeasurement>,
}
