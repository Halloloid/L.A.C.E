use nalgebra::{Matrix2, Point2, Vector2};

use crate::models::{
    geometry::{BoundingBox, PhysicalWordMeasurement, Point, ScaleCalculation, WordGeometry},
    ocr::OcrSpaceResponse,
};

pub fn calculate_word_geometry(ocr_data: &OcrSpaceResponse) -> Vec<WordGeometry> {
    ocr_data
        .parsed_results
        .iter()
        .filter_map(|result| result.text_overlay.as_ref())
        .flat_map(|overlay| overlay.lines.iter())
        .flat_map(|line| line.words.iter())
        .filter_map(|word| {
            let left = f64::from(word.left?);
            let top = f64::from(word.top?);
            let width = f64::from(word.width?);
            let height = f64::from(word.height?);

            if width <= 0.0 || height <= 0.0 {
                return None;
            }

            let original_box = bounding_box(left, top, width, height);
            let center = Point2::new(left + width / 2.0, top + height / 2.0);
            let angle_radians = calculate_angle(&original_box);
            let deskewed_box = rotate_box_inverse(&original_box, center, angle_radians);

            Some(WordGeometry {
                text: word.word_text.clone(),
                angle_degrees: angle_radians.to_degrees(),
                center: point(center),
                original_box,
                deskewed_box,
            })
        })
        .collect()
}

pub fn calculate_scale(
    geometry: &[WordGeometry],
    barcode_length_cm: f64,
    ocr_data: &OcrSpaceResponse,
) -> Option<ScaleCalculation> {
    let barcode_length_px = find_barcode_number_span(ocr_data)?;

    let pixels_per_cm = barcode_length_px / barcode_length_cm;
    let words = geometry
        .iter()
        .map(|word| PhysicalWordMeasurement {
            text: word.text.clone(),
            width_cm: distance(&word.deskewed_box.top_left, &word.deskewed_box.top_right)
                / pixels_per_cm,
            height_cm: distance(&word.deskewed_box.top_left, &word.deskewed_box.bottom_left)
                / pixels_per_cm,
        })
        .collect();

    Some(ScaleCalculation {
        barcode_length_cm,
        barcode_length_px,
        pixels_per_cm,
        calibration_source: "barcode_number_coordinates",
        calibration_confidence: "measured",
        words,
    })
}

fn find_barcode_number_span(ocr_data: &OcrSpaceResponse) -> Option<f64> {
    ocr_data
        .parsed_results
        .iter()
        .filter_map(|result| result.text_overlay.as_ref())
        .flat_map(|overlay| overlay.lines.iter())
        .filter_map(|line| {
            let mut numeric_words = line
                .words
                .iter()
                .filter_map(|word| {
                    let left = f64::from(word.left?);
                    let width = f64::from(word.width?);
                    let digits = word
                        .word_text
                        .chars()
                        .filter(|character| character.is_ascii_digit())
                        .count();

                    if digits == 0 || width <= 0.0 {
                        return None;
                    }

                    Some((left, left + width, digits))
                })
                .collect::<Vec<_>>();

            if numeric_words.is_empty() {
                return None;
            }

            numeric_words.sort_by(|first, second| first.0.total_cmp(&second.0));

            let total_digits = numeric_words
                .iter()
                .map(|(_, _, digits)| digits)
                .sum::<usize>();
            let span = numeric_words.last()?.1 - numeric_words.first()?.0;

            if total_digits >= 8 && span > 0.0 {
                Some((total_digits, span))
            } else {
                None
            }
        })
        .max_by(|first, second| {
            first
                .0
                .cmp(&second.0)
                .then_with(|| first.1.total_cmp(&second.1))
        })
        .map(|(_, span)| span)
}

fn distance(first: &Point, second: &Point) -> f64 {
    let delta = Vector2::new(second.x - first.x, second.y - first.y);
    delta.norm()
}

fn bounding_box(left: f64, top: f64, width: f64, height: f64) -> BoundingBox {
    BoundingBox {
        top_left: Point { x: left, y: top },
        top_right: Point {
            x: left + width,
            y: top,
        },
        bottom_right: Point {
            x: left + width,
            y: top + height,
        },
        bottom_left: Point {
            x: left,
            y: top + height,
        },
    }
}

fn calculate_angle(bounding_box: &BoundingBox) -> f64 {
    let dx = bounding_box.top_right.x - bounding_box.top_left.x;
    let dy = bounding_box.top_right.y - bounding_box.top_left.y;
    dy.atan2(dx)
}

fn rotate_box_inverse(
    bounding_box: &BoundingBox,
    center: Point2<f64>,
    angle_radians: f64,
) -> BoundingBox {
    let rotation = Matrix2::new(
        angle_radians.cos(),
        angle_radians.sin(),
        -angle_radians.sin(),
        angle_radians.cos(),
    );

    BoundingBox {
        top_left: rotate_point(&bounding_box.top_left, center, &rotation),
        top_right: rotate_point(&bounding_box.top_right, center, &rotation),
        bottom_right: rotate_point(&bounding_box.bottom_right, center, &rotation),
        bottom_left: rotate_point(&bounding_box.bottom_left, center, &rotation),
    }
}

fn rotate_point(point: &Point, center: Point2<f64>, rotation: &Matrix2<f64>) -> Point {
    let translated = Vector2::new(point.x - center.x, point.y - center.y);
    let rotated = rotation * translated;

    Point {
        x: rotated.x + center.x,
        y: rotated.y + center.y,
    }
}

fn point(point: Point2<f64>) -> Point {
    Point {
        x: point.x,
        y: point.y,
    }
}
