use nalgebra::{Matrix2, Point2, Vector2};

use crate::models::{
    geometry::{BoundingBox, Point, WordGeometry},
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
