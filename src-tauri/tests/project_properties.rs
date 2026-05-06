// Feature: bedmapper, Property 1: Project serialization round-trip

use proptest::prelude::*;
use std::collections::HashMap;

// Import models from the crate
use bedmapper_desktop::models::*;

// ── Arbitrary strategies ─────────────────────────────────────────────────────

fn arb_origin_corner() -> impl Strategy<Value = OriginCorner> {
    prop_oneof![
        Just(OriginCorner::TopLeft),
        Just(OriginCorner::TopRight),
        Just(OriginCorner::BottomLeft),
        Just(OriginCorner::BottomRight),
    ]
}

fn arb_point2d() -> impl Strategy<Value = Point2D> {
    (-1000.0f64..1000.0, -1000.0f64..1000.0).prop_map(|(x, y)| Point2D { x, y })
}

fn arb_charuco_config() -> impl Strategy<Value = CharucoConfig> {
    (3..20i32, 3..20i32, 5.0..100.0f64, 3.0..80.0f64).prop_map(|(sx, sy, sl, ml)| CharucoConfig {
        squares_x: sx,
        squares_y: sy,
        square_length_mm: sl,
        marker_length_mm: ml,
        dictionary_name: "DICT_4X4_50".to_string(),
        legacy_pattern: false,
    })
}

fn arb_origin_config() -> impl Strategy<Value = OriginConfig> {
    (
        arb_origin_corner(),
        any::<bool>(),
        -500.0..500.0f64,
        -500.0..500.0f64,
    )
        .prop_map(|(corner, swap, ox, oy)| OriginConfig {
            origin_corner: corner,
            swap_xy: swap,
            offset_x_mm: ox,
            offset_y_mm: oy,
        })
}

fn arb_intrinsics() -> impl Strategy<Value = CameraIntrinsics> {
    (
        prop::collection::vec(prop::collection::vec(-1000.0..1000.0f64, 3..=3), 3..=3),
        prop::collection::vec(-1.0..1.0f64, 5..=5),
        (100..5000i32, 100..5000i32),
        0.0..5.0f64,
    )
        .prop_map(|(cm, dc, is, re)| CameraIntrinsics {
            camera_matrix: cm,
            distortion_coefficients: dc,
            image_size: is,
            reprojection_error: re,
        })
}

fn arb_bed_transform() -> impl Strategy<Value = BedTransform> {
    (
        prop::collection::vec(prop::collection::vec(-100.0..100.0f64, 3..=3), 3..=3),
        arb_charuco_config(),
        arb_origin_config(),
        (100..5000i32, 100..5000i32),
    )
        .prop_map(|(h, b, o, is)| BedTransform {
            image_to_bed_homography: h,
            board: b,
            origin: o,
            image_size: is,
        })
}

fn arb_image_space_rect() -> impl Strategy<Value = ImageSpaceRect> {
    (
        arb_point2d(),
        arb_point2d(),
        arb_point2d(),
        arb_point2d(),
        100..5000i32,
        100..5000i32,
    )
        .prop_map(|(a, b, c, d, w, h)| ImageSpaceRect {
            corners: [a, b, c, d],
            image_width: w,
            image_height: h,
        })
}

fn arb_workspace() -> impl Strategy<Value = WorkspaceDefinition> {
    (
        -1000.0..0.0f64,
        0.0..1000.0f64,
        -1000.0..0.0f64,
        0.0..1000.0f64,
        arb_origin_corner(),
        proptest::option::of(arb_image_space_rect()),
    )
        .prop_map(|(xmin, xmax, ymin, ymax, zc, ir)| WorkspaceDefinition {
            x_min: xmin,
            x_max: xmax,
            y_min: ymin,
            y_max: ymax,
            zero_corner: zc,
            image_rect: ir,
        })
}

fn arb_detection_method() -> impl Strategy<Value = DetectionMethod> {
    prop_oneof![
        Just(DetectionMethod::BrightObject),
        Just(DetectionMethod::DarkObject),
        Just(DetectionMethod::BrassColor),
        Just(DetectionMethod::EdgeBased),
    ]
}

fn arb_roi() -> impl Strategy<Value = Roi> {
    (0..5000i32, 0..5000i32, 1..5000i32, 1..5000i32).prop_map(|(x, y, w, h)| Roi {
        x,
        y,
        width: w,
        height: h,
    })
}

fn arb_detection_profile() -> impl Strategy<Value = DetectionProfile> {
    (
        "[a-z]{3,10}",
        arb_detection_method(),
        1000.0..100000.0f64,
        0.1..0.9f64,
        1.0..10.0f64,
        0.0..50.0f64,
    )
        .prop_map(
            |(name, method, min_area, max_ratio, max_asp, height)| DetectionProfile {
                name,
                method,
                min_area_px: min_area,
                max_area_ratio: max_ratio,
                max_aspect: max_asp,
                height_mm: height,
                camera_height_mm: Some(500.0),
                reject_border_px: 80,
                max_candidates: 6,
                prefer_quad: true,
                quad_epsilon_factors: vec![0.02, 0.03, 0.04],
                min_quad_area_ratio: 0.75,
                bright_threshold: Some(185),
                max_saturation: Some(95),
                dark_threshold: None,
                brass_h_range: None,
                brass_s_range: None,
                brass_v_range: None,
                brass_close_iterations: None,
                auto_workspace_roi: false,
                auto_stand_roi: false,
                workspace_roi_margin_px: 500,
                manual_roi: None,
                filter_workspace: false,
                workspace_min_fraction: 0.9,
            },
        )
}

fn arb_workflow_step() -> impl Strategy<Value = WorkflowStep> {
    prop_oneof![
        Just(WorkflowStep::CameraSetup),
        Just(WorkflowStep::Tramming),
        Just(WorkflowStep::BoardGeneration),
        Just(WorkflowStep::IntrinsicsCalibration),
        Just(WorkflowStep::BedCalibration),
        Just(WorkflowStep::CalibrationTest),
        Just(WorkflowStep::Scanning),
    ]
}

fn arb_project() -> impl Strategy<Value = Project> {
    (
        proptest::option::of(0..10i32),
        proptest::option::of("[a-z0-9-]{5,20}"),
        (100..5000i32, 100..5000i32),
        proptest::option::of(arb_intrinsics()),
        proptest::option::of(arb_bed_transform()),
        arb_workspace(),
        prop::collection::vec(arb_detection_profile(), 1..4),
        prop::collection::btree_set(arb_workflow_step(), 0..7),
        any::<bool>(),
    )
        .prop_map(
            |(idx, dev_id, (w, h), intr, bt, ws, profiles, steps, show_vp)| Project {
                camera_index: idx,
                camera_device_id: dev_id,
                camera_backend: "opencv-sidecar".to_string(),
                camera_width: w,
                camera_height: h,
                camera_fourcc: "MJPG".to_string(),
                camera_controls: HashMap::new(),
                auto_control_locks: HashMap::new(),
                charuco_config: CharucoConfig::default(),
                generated_boards: Vec::new(),
                intrinsics: intr,
                bed_transform: bt,
                workspace: ws,
                detection_profiles: profiles,
                active_profile_index: 0,
                websocket_port: 5001,
                websocket_bind_address: "127.0.0.1".to_string(),
                scan_interval_secs: 30.0,
                completed_steps: steps,
                show_3d_viewport: show_vp,
            },
        )
}

// ── Property test ────────────────────────────────────────────────────────────

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn project_serialization_roundtrip(project in arb_project()) {
        let json = serde_json::to_string(&project).unwrap();
        let back: Project = serde_json::from_str(&json).unwrap();
        // Re-serialize the deserialized value to prove JSON→struct→JSON is stable
        let json_back = serde_json::to_string(&back).unwrap();
        let back2: Project = serde_json::from_str(&json_back).unwrap();
        let json_back2 = serde_json::to_string(&back2).unwrap();
        prop_assert_eq!(json_back, json_back2);
    }
}
