use crate::models::*;

#[derive(Debug, Clone, PartialEq)]
pub enum StepSeverity {
    /// Informational — step can proceed
    Warning,
    /// Blocking — step cannot proceed unless user explicitly overrides
    Blocking,
}

#[derive(Debug, Clone)]
pub struct StepWarning {
    pub severity: StepSeverity,
    pub message: String,
}

/// Validate prerequisites for a workflow step given the current project state.
/// Returns an empty vec if all prerequisites are met.
pub fn validate_step_prerequisites(
    step: &WorkflowStep,
    project: &Project,
    current_camera_width: Option<i32>,
    current_camera_height: Option<i32>,
) -> Vec<StepWarning> {
    let mut warnings = Vec::new();

    match step {
        WorkflowStep::CameraSetup => {
            // No prerequisites
        }
        WorkflowStep::Tramming => {
            if !project.completed_steps.contains(&WorkflowStep::CameraSetup) {
                warnings.push(StepWarning {
                    severity: StepSeverity::Blocking,
                    message: "Camera setup must be completed first.".to_string(),
                });
            }
        }
        WorkflowStep::BoardGeneration => {
            // Can be done independently
        }
        WorkflowStep::IntrinsicsCalibration => {
            if !project.completed_steps.contains(&WorkflowStep::CameraSetup) {
                warnings.push(StepWarning {
                    severity: StepSeverity::Blocking,
                    message: "Camera setup must be completed first.".to_string(),
                });
            }
        }
        WorkflowStep::BedCalibration => {
            if !project.completed_steps.contains(&WorkflowStep::CameraSetup) {
                warnings.push(StepWarning {
                    severity: StepSeverity::Blocking,
                    message: "Camera setup must be completed first.".to_string(),
                });
            }
        }
        WorkflowStep::CalibrationTest => {
            if project.bed_transform.is_none() {
                warnings.push(StepWarning {
                    severity: StepSeverity::Blocking,
                    message: "Bed calibration must be completed first.".to_string(),
                });
            }
        }
        WorkflowStep::Scanning => {
            if project.bed_transform.is_none() {
                warnings.push(StepWarning {
                    severity: StepSeverity::Blocking,
                    message: "Bed calibration is required before scanning.".to_string(),
                });
            }
            if project.intrinsics.is_none() {
                warnings.push(StepWarning {
                    severity: StepSeverity::Warning,
                    message:
                        "Camera intrinsics not calibrated. Lens distortion will not be corrected."
                            .to_string(),
                });
            }
        }
    }

    // Resolution mismatch checks
    if let (Some(cam_w), Some(cam_h)) = (current_camera_width, current_camera_height) {
        // Intrinsics mismatch — warning
        if let Some(ref intr) = project.intrinsics {
            if intr.image_size != (cam_w, cam_h) {
                warnings.push(StepWarning {
                    severity: StepSeverity::Warning,
                    message: format!(
                        "Camera intrinsics were calibrated at {}x{} but camera is now {}x{}. Consider recalibrating.",
                        intr.image_size.0, intr.image_size.1, cam_w, cam_h
                    ),
                });
            }
        }

        // Bed transform mismatch — blocking
        if let Some(ref bt) = project.bed_transform {
            if bt.image_size != (cam_w, cam_h) {
                warnings.push(StepWarning {
                    severity: StepSeverity::Blocking,
                    message: format!(
                        "Bed transform was calibrated at {}x{} but camera is now {}x{}. Scanning is blocked. Recalibrate or explicitly override.",
                        bt.image_size.0, bt.image_size.1, cam_w, cam_h
                    ),
                });
            }
        }
    }

    warnings
}
