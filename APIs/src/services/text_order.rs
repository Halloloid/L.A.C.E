//! Reconstructs a more useful top-to-bottom reading order from OCR line
//! coordinates.
//!
//! OCR.space's `ParsedText` field concatenates detected text blocks in its
//! own internal (often column-major) order, which can print every label on
//! a food label first and every value second, even though they are meant to
//! be read as interleaved rows. Each individual `Line` that OCR.space
//! returns is already internally well-ordered (its `LineText` and `Words`
//! are in correct left-to-right order) — the only thing wrong is the order
//! in which whole lines are concatenated.
//!
//! This module never re-groups or re-orders words within a line: it only
//! reorders whole lines using their `MinTop` (and leftmost word, as a
//! tiebreaker) so that lines are emitted in a sensible top-to-bottom order.
//!
//! Deliberately *not* attempted: merging multiple OCR lines that sit close
//! together vertically into a single reconstructed row. An earlier version
//! of this module tried that using a distance-based heuristic, but real
//! labels can have label-row spacing and label-to-value spacing in the same
//! numeric range, making any single threshold unreliable — it will
//! sometimes weld unrelated rows together and scramble their words. Sorting
//! whole, untouched lines is a strictly safer trade-off: individual lines
//! can never be corrupted, even though a label and its value may end up a
//! line or two apart rather than merged onto one line.

use crate::models::ocr::{OcrSpaceLine, OcrSpaceResponse};

struct PositionedLine<'a> {
    text: &'a str,
    top: f64,
    left: f64,
}

/// Reconstructs OCR text by sorting whole lines into top-to-bottom (then
/// left-to-right) order using their bounding-box coordinates.
///
/// Returns `None` when no overlay coordinates are available, so callers can
/// fall back to the raw `ParsedText` output.
pub fn reconstruct_reading_order(ocr_data: &OcrSpaceResponse) -> Option<String> {
    let mut lines = collect_positioned_lines(ocr_data);

    if lines.is_empty() {
        return None;
    }

    lines.sort_by(|a, b| {
        a.top
            .total_cmp(&b.top)
            .then_with(|| a.left.total_cmp(&b.left))
    });

    let text = lines
        .into_iter()
        .map(|line| line.text.trim())
        .filter(|text| !text.is_empty())
        .collect::<Vec<_>>()
        .join("\n");

    if text.is_empty() { None } else { Some(text) }
}

fn collect_positioned_lines(ocr_data: &OcrSpaceResponse) -> Vec<PositionedLine<'_>> {
    ocr_data
        .parsed_results
        .iter()
        .filter_map(|result| result.text_overlay.as_ref())
        .flat_map(|overlay| overlay.lines.iter())
        .filter_map(|line| {
            if line.line_text.trim().is_empty() {
                return None;
            }

            Some(PositionedLine {
                text: line.line_text.as_str(),
                top: line_top(line)?,
                left: line_left(line),
            })
        })
        .collect()
}

fn line_top(line: &OcrSpaceLine) -> Option<f64> {
    line.min_top.map(f64::from).or_else(|| {
        line.words
            .iter()
            .filter_map(|word| word.top)
            .min()
            .map(f64::from)
    })
}

fn line_left(line: &OcrSpaceLine) -> f64 {
    line.words
        .iter()
        .filter_map(|word| word.left)
        .min()
        .map(f64::from)
        .unwrap_or(0.0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::ocr::{OcrSpaceParsedResult, OcrSpaceTextOverlay, OcrSpaceWord};

    fn word(text: &str, left: i32, top: i32, width: i32, height: i32) -> OcrSpaceWord {
        OcrSpaceWord {
            word_text: text.to_owned(),
            left: Some(left),
            top: Some(top),
            width: Some(width),
            height: Some(height),
        }
    }

    fn line(text: &str, min_top: Option<i32>, words: Vec<OcrSpaceWord>) -> OcrSpaceLine {
        OcrSpaceLine {
            line_text: text.to_owned(),
            words,
            max_height: None,
            min_top,
        }
    }

    fn response_from_lines(lines: Vec<OcrSpaceLine>) -> OcrSpaceResponse {
        OcrSpaceResponse {
            parsed_results: vec![OcrSpaceParsedResult {
                text_overlay: Some(OcrSpaceTextOverlay {
                    lines,
                    has_overlay: true,
                    message: None,
                }),
                file_parse_exit_code: None,
                parsed_text: String::new(),
                error_message: None,
                error_details: None,
                text_orientation: None,
                barcodes: Vec::new(),
            }],
            ocr_exit_code: None,
            is_errored_on_processing: false,
            error_message: None,
            processing_time_in_milliseconds: None,
            searchable_pdf_url: None,
        }
    }

    #[test]
    fn reorders_column_major_label_value_blocks_by_vertical_position() {
        // Mirrors the real OCR.space shape: every label line is returned
        // before every value line, even though the values sit at
        // interleaved vertical positions among the labels.
        let lines = vec![
            line(
                "NET WEIGHT:",
                Some(725),
                vec![
                    word("NET", 88, 725, 59, 40),
                    word("WEIGHT:", 151, 725, 123, 40),
                ],
            ),
            line(
                "MRP Rs.",
                Some(762),
                vec![word("MRP", 160, 763, 60, 36), word("Rs.", 224, 762, 53, 35)],
            ),
            line("110", Some(753), vec![word("110", 411, 753, 49, 26)]),
        ];

        let result = reconstruct_reading_order(&response_from_lines(lines)).unwrap();

        assert_eq!(result, "NET WEIGHT:\n110\nMRP Rs.");
    }

    #[test]
    fn never_reorders_or_merges_words_within_a_single_line() {
        // Even if a line's own words were (hypothetically) recorded out of
        // left-to-right order internally, this module trusts OCR.space's
        // LineText and must not attempt to re-sort words itself.
        let lines = vec![line(
            "26/19:46 02B18",
            Some(815),
            vec![
                word("26", 426, 820, 173, 36),
                word("/", 426, 820, 173, 36),
                word("19", 426, 820, 173, 36),
                word(":", 426, 820, 173, 36),
                word("46", 426, 820, 173, 36),
                word("02B18", 601, 815, 101, 32),
            ],
        )];

        let result = reconstruct_reading_order(&response_from_lines(lines)).unwrap();

        assert_eq!(result, "26/19:46 02B18");
    }

    #[test]
    fn breaks_ties_at_the_same_top_by_leftmost_word() {
        let lines = vec![
            line("9", Some(753), vec![word("9", 478, 753, 19, 23)]),
            line("110", Some(753), vec![word("110", 411, 753, 49, 26)]),
        ];

        let result = reconstruct_reading_order(&response_from_lines(lines)).unwrap();

        assert_eq!(result, "110\n9");
    }

    #[test]
    fn reconstructs_the_reported_real_world_label_in_a_sensible_order() {
        // Reduced to the fields relevant to ordering, taken directly from a
        // real OCR.space response that previously produced scrambled text
        // ("24 29 JUL JAN 26 / 19 : 46 27 / 5.50") under the old word-level
        // clustering approach.
        let lines = vec![
            line(
                "PROPRIETARY FOOD - SLICE CAKE (72.",
                Some(660),
                vec![word("PROPRIETARY", 180, 673, 205, 52)],
            ),
            line("NET WEIGHT:", Some(725), vec![word("NET", 88, 725, 59, 40)]),
            line("MRP Rs.", Some(762), vec![word("MRP", 160, 763, 60, 36)]),
            line(
                "incl. of all taxes /",
                Some(797),
                vec![word("incl", 18, 803, 69, 34)],
            ),
            line("(Rs.per g)", Some(833), vec![word("(", 135, 833, 110, 44)]),
            line(
                "PKD./BATCH No.:",
                Some(873),
                vec![word("PKD", 37, 873, 176, 39)],
            ),
            line(
                "USE BY/ NS:",
                Some(909),
                vec![word("USE", 106, 909, 63, 37)],
            ),
            line("110", Some(753), vec![word("110", 411, 753, 49, 26)]),
            line("9", Some(753), vec![word("9", 478, 753, 19, 23)]),
            line(
                "40.00/00",
                Some(805),
                vec![word("40.00", 316, 805, 137, 28)],
            ),
            line("36)", Some(800), vec![word("36", 455, 800, 67, 30)]),
            line("29", Some(833), vec![word("29", 318, 833, 39, 28)]),
            line("JUL", Some(833), vec![word("JUL", 355, 833, 72, 23)]),
            line(
                "26/19:46 02B18",
                Some(815),
                vec![
                    word("26", 426, 820, 173, 36),
                    word("02B18", 601, 815, 101, 32),
                ],
            ),
            line(
                "24 JAN 27/5.50",
                Some(851),
                vec![word("24", 317, 856, 48, 31)],
            ),
        ];

        let result = reconstruct_reading_order(&response_from_lines(lines)).unwrap();

        assert_eq!(
            result,
            "PROPRIETARY FOOD - SLICE CAKE (72.\n\
             NET WEIGHT:\n\
             110\n\
             9\n\
             MRP Rs.\n\
             incl. of all taxes /\n\
             36)\n\
             40.00/00\n\
             26/19:46 02B18\n\
             (Rs.per g)\n\
             29\n\
             JUL\n\
             24 JAN 27/5.50\n\
             PKD./BATCH No.:\n\
             USE BY/ NS:"
        );
    }

    #[test]
    fn returns_none_when_no_overlay_coordinates_are_present() {
        let ocr_data = OcrSpaceResponse {
            parsed_results: vec![OcrSpaceParsedResult {
                text_overlay: None,
                file_parse_exit_code: None,
                parsed_text: "some text".to_owned(),
                error_message: None,
                error_details: None,
                text_orientation: None,
                barcodes: Vec::new(),
            }],
            ocr_exit_code: None,
            is_errored_on_processing: false,
            error_message: None,
            processing_time_in_milliseconds: None,
            searchable_pdf_url: None,
        };

        assert!(reconstruct_reading_order(&ocr_data).is_none());
    }
}
