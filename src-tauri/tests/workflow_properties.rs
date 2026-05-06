// Feature: bedmapper, Property 8: Workflow prerequisite validation
// Feature: bedmapper, Property 10: Calibration resolution invalidation

use bedmapper_desktop::models::*;
use bedmapper_desktop::workflow::*;
use proptest::prelude::*;

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

fn make_intrinsics(w: i32, h: i32) -> CameraIntrinsics {
    CameraIntrinsics {
        camera_matrix: vec![
            vec![1.0, 0.0, 0.0],
            vec![0.0, 1.0, 0.0],
            vec![0.0, 0.0, 1.0],
        ],
        distortion_coefficients: vec![0.0; 5],
        image_size: (w, h),
        reprojection_error: 0.5,
    }
}

fn make_bed_transform(w: i32, h: i32) -> BedTransform {
    BedTransform {
        image_to_bed_homography: vec![
            vec![1.0, 0.0, 0.0],
            vec![0.0, 1.0, 0.0],
            vec![0.0, 0.0, 1.0],
        ],
        board: CharucoConfig::default(),
        origin: OriginConfig::default(),
        image_size: (w, h),
    }
}

// ── Property 8: Workflow prerequisite validation ─────────────────────────────

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn scanning_requires_bed_transform(
        has_bt in any::<bool>(),
        has_intr in any::<bool>(),
        steps in prop::collection::btree_set(arb_workflow_step(), 0..7),
    ) {
        let mut project = Project::default();
        project.completed_steps = steps;
        if has_bt {
            project.bed_transform = Some(make_bed_transform(1920, 1080));
        }
        if has_intr {
            project.intrinsics = Some(make_intrinsics(1920, 1080));
        }

        let warnings = validate_step_prerequisites(
            &WorkflowStep::Scanning, &project, Some(1920), Some(1080),
        );

        if !has_bt {
            // Must have a blocking warning about missing bed transform
            prop_assert!(
                warnings.iter().any(|w| w.severity == StepSeverity::Blocking
                    && w.message.contains("Bed calibration")),
                "Expected blocking warning for missing bed_transform"
            );
        }
        if has_bt && !has_intr {
            // Should warn about missing intrinsics (non-blocking)
            prop_assert!(
                warnings.iter().any(|w| w.severity == StepSeverity::Warning
                    && w.message.contains("intrinsics")),
                "Expected warning for missing intrinsics"
            );
        }
        if has_bt && has_intr {
            // No prerequisite warnings (resolution matches)
            let prereq_warnings: Vec<_> = warnings.iter()
                .filter(|w| !w.message.contains("calibrated at"))
                .collect();
            prop_assert!(prereq_warnings.is_empty(),
                "Expected no prerequisite warnings, got: {:?}", prereq_warnings);
        }
    }
}

// ── Property 10: Calibration resolution invalidation ─────────────────────────

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn resolution_mismatch_intrinsics_warns(
        calib_w in 100..5000i32,
        calib_h in 100..5000i32,
        cam_w in 100..5000i32,
        cam_h in 100..5000i32,
    ) {
        let mut project = Project::default();
        project.intrinsics = Some(make_intrinsics(calib_w, calib_h));
        project.bed_transform = Some(make_bed_transform(cam_w, cam_h));

        let warnings = validate_step_prerequisites(
            &WorkflowStep::Scanning, &project, Some(cam_w), Some(cam_h),
        );

        let intr_warnings: Vec<_> = warnings.iter()
            .filter(|w| w.message.contains("intrinsics were calibrated"))
            .collect();

        if (calib_w, calib_h) != (cam_w, cam_h) {
            prop_assert!(!intr_warnings.is_empty(),
                "Expected intrinsics mismatch warning for {}x{} vs {}x{}",
                calib_w, calib_h, cam_w, cam_h);
            prop_assert!(intr_warnings.iter().all(|w| w.severity == StepSeverity::Warning),
                "Intrinsics mismatch should be Warning, not Blocking");
        } else {
            prop_assert!(intr_warnings.is_empty(),
                "No intrinsics warning expected when resolutions match");
        }
    }

    #[test]
    fn resolution_mismatch_bed_transform_blocks(
        calib_w in 100..5000i32,
        calib_h in 100..5000i32,
        cam_w in 100..5000i32,
        cam_h in 100..5000i32,
    ) {
        let mut project = Project::default();
        project.intrinsics = Some(make_intrinsics(cam_w, cam_h)); // intrinsics match
        project.bed_transform = Some(make_bed_transform(calib_w, calib_h));

        let warnings = validate_step_prerequisites(
            &WorkflowStep::Scanning, &project, Some(cam_w), Some(cam_h),
        );

        let bt_warnings: Vec<_> = warnings.iter()
            .filter(|w| w.message.contains("Bed transform was calibrated"))
            .collect();

        if (calib_w, calib_h) != (cam_w, cam_h) {
            prop_assert!(!bt_warnings.is_empty(),
                "Expected bed transform mismatch blocking error for {}x{} vs {}x{}",
                calib_w, calib_h, cam_w, cam_h);
            prop_assert!(bt_warnings.iter().all(|w| w.severity == StepSeverity::Blocking),
                "Bed transform mismatch should be Blocking");
        } else {
            prop_assert!(bt_warnings.is_empty(),
                "No bed transform warning expected when resolutions match");
        }
    }
}
