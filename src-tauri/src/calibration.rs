use crate::models::*;
use crate::sidecar;

pub fn squares_for_paper(
    paper_width_mm: f64,
    paper_height_mm: f64,
    square_length_mm: f64,
) -> (i32, i32) {
    let sx = (paper_width_mm / square_length_mm).floor() as i32;
    let sy = (paper_height_mm / square_length_mm).floor() as i32;
    (sx.max(2), sy.max(2))
}

pub fn detect_charuco_in_jpeg(
    jpeg_bytes: &[u8],
    config: &CharucoConfig,
) -> Result<CharucoDetectionResult, String> {
    sidecar::detect_charuco_jpeg(jpeg_bytes, config)
}

pub fn compute_intrinsics_from_board_frames(
    detections: &[CalibrationDetectionFrame],
    image_size: (i32, i32),
    px_per_mm: Option<f64>,
) -> Result<IntrinsicsResult, String> {
    sidecar::compute_intrinsics(detections, image_size, px_per_mm)
}
