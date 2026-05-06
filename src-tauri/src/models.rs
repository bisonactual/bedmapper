use serde::{Deserialize, Serialize};
use std::collections::{BTreeSet, HashMap};

// ── Camera Models ────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackendInfo {
    pub name: String,
    pub available: bool,
    pub platform: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CameraInfo {
    pub index: i32,
    pub name: String,
    pub available: bool,
    /// Stable device identifier (USB serial, /dev/v4l/by-id/, vendor:product+bus).
    /// None if the platform/backend cannot provide a stable ID.
    pub device_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CameraOpenResult {
    pub actual_width: i32,
    pub actual_height: i32,
    pub actual_fourcc: String,
    pub actual_fps: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CameraCapabilities {
    pub resolutions: Vec<Resolution>,
    pub formats: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Resolution {
    pub width: i32,
    pub height: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CameraControl {
    pub id: i32,
    /// Stable string key for persistence (e.g. "brightness", "focus_absolute").
    pub key: String,
    pub name: String,
    pub control_type: ControlType,
    pub value: i32,
    pub min: i32,
    pub max: i32,
    pub step: i32,
    pub default: i32,
    pub supported: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ControlType {
    Integer,
    Boolean,
    Menu,
}

// ── Calibration Models ───────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CharucoConfig {
    pub squares_x: i32,
    pub squares_y: i32,
    pub square_length_mm: f64,
    pub marker_length_mm: f64,
    pub dictionary_name: String,
    #[serde(default)]
    pub legacy_pattern: bool,
}

impl Default for CharucoConfig {
    fn default() -> Self {
        Self {
            squares_x: 7,
            squares_y: 7,
            square_length_mm: 20.0,
            marker_length_mm: 14.0,
            dictionary_name: "DICT_4X4_50".to_string(),
            legacy_pattern: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CharucoDetectionResult {
    pub corner_count: usize,
    pub corners: Vec<Point2D>,
    pub ids: Vec<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct GeneratedCharucoBoard {
    pub id: String,
    pub name: String,
    pub config: CharucoConfig,
    pub paper_width_mm: f64,
    pub paper_height_mm: f64,
    pub board_width_mm: f64,
    pub board_height_mm: f64,
    pub path: String,
    #[serde(default)]
    pub svg_path: Option<String>,
    pub width_px: i32,
    pub height_px: i32,
    pub verification_corner_count: usize,
    pub verification_passed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BoardGenerationResult {
    pub path: String,
    #[serde(default)]
    pub svg_path: Option<String>,
    #[serde(default)]
    pub board: Option<GeneratedCharucoBoard>,
    pub width_px: i32,
    pub height_px: i32,
    pub verification_corner_count: usize,
    pub verification_passed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CalibrationFrameResult {
    pub frame_index: usize,
    pub board_id: String,
    pub board_name: String,
    pub corner_count: usize,
    pub expected_corner_count: usize,
    pub total_frames: usize,
    pub accepted: bool,
    pub rejection_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CalibrationDetectionFrame {
    pub board_id: String,
    pub board_name: String,
    pub config: CharucoConfig,
    pub corners: Vec<Point2D>,
    pub ids: Vec<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CalibrationFrameSummary {
    pub frame_index: usize,
    pub board_id: String,
    pub board_name: String,
    pub corner_count: usize,
    pub expected_corner_count: usize,
    pub reprojection_error_px: Option<f64>,
    pub approx_error_mm: Option<f64>,
    pub quality_label: String,
    pub quality_level: String,
    pub flags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CameraIntrinsics {
    pub camera_matrix: Vec<Vec<f64>>,
    pub distortion_coefficients: Vec<f64>,
    /// Image resolution at which intrinsics were computed.
    pub image_size: (i32, i32),
    pub reprojection_error: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntrinsicsResult {
    pub intrinsics: CameraIntrinsics,
    pub reprojection_error: f64,
    pub frames_used: usize,
    pub mean_frame_error_px: f64,
    pub max_frame_error_px: f64,
    pub approx_mean_error_mm: Option<f64>,
    pub approx_max_error_mm: Option<f64>,
    pub px_per_mm: Option<f64>,
    pub frame_summaries: Vec<CalibrationFrameSummary>,
}

// ── Homography and Origin Models ─────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct OriginConfig {
    pub origin_corner: OriginCorner,
    pub swap_xy: bool,
    pub offset_x_mm: f64,
    pub offset_y_mm: f64,
}

impl Default for OriginConfig {
    fn default() -> Self {
        Self {
            origin_corner: OriginCorner::TopRight,
            swap_xy: false,
            offset_x_mm: 0.0,
            offset_y_mm: 0.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum OriginCorner {
    TopLeft,
    TopRight,
    BottomLeft,
    BottomRight,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HomographyResult {
    pub corners_used: usize,
    pub homography: Vec<Vec<f64>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct BedTransform {
    pub image_to_bed_homography: Vec<Vec<f64>>,
    pub board: CharucoConfig,
    pub origin: OriginConfig,
    /// Image resolution at which the homography was computed.
    pub image_size: (i32, i32),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct WorkspaceDefinition {
    pub x_min: f64,
    pub x_max: f64,
    pub y_min: f64,
    pub y_max: f64,
    pub zero_corner: OriginCorner,
    /// Image-space rectangle the user drew. None if entered numerically.
    pub image_rect: Option<ImageSpaceRect>,
}

impl Default for WorkspaceDefinition {
    fn default() -> Self {
        Self {
            x_min: -560.0,
            x_max: 0.0,
            y_min: -430.0,
            y_max: 0.0,
            zero_corner: OriginCorner::TopRight,
            image_rect: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ImageSpaceRect {
    pub corners: [Point2D; 4],
    pub image_width: i32,
    pub image_height: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrammingFeedback {
    pub board_detected: bool,
    pub corner_count: usize,
    pub offset_x_px: f64,
    pub offset_y_px: f64,
    pub rotation_deg: f64,
    pub alignment_score: f64,
    pub hints: Vec<String>,
}

// ── Detection Models ─────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum DetectionMethod {
    BrightObject,
    DarkObject,
    BrassColor,
    EdgeBased,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DetectionProfile {
    pub name: String,
    pub method: DetectionMethod,
    pub min_area_px: f64,
    pub max_area_ratio: f64,
    pub max_aspect: f64,
    pub height_mm: f64,
    pub camera_height_mm: Option<f64>,
    pub reject_border_px: i32,
    pub max_candidates: usize,
    pub prefer_quad: bool,
    pub quad_epsilon_factors: Vec<f64>,
    pub min_quad_area_ratio: f64,
    // Method-specific
    pub bright_threshold: Option<i32>,
    pub max_saturation: Option<i32>,
    pub dark_threshold: Option<i32>,
    pub brass_h_range: Option<(i32, i32)>,
    pub brass_s_range: Option<(i32, i32)>,
    pub brass_v_range: Option<(i32, i32)>,
    pub brass_close_iterations: Option<i32>,
    // ROI
    pub auto_workspace_roi: bool,
    pub auto_stand_roi: bool,
    pub workspace_roi_margin_px: i32,
    pub manual_roi: Option<Roi>,
    // Workspace filtering
    pub filter_workspace: bool,
    pub workspace_min_fraction: f64,
}

impl DetectionProfile {
    pub fn bright_object_default() -> Self {
        Self {
            name: "Bright Object".to_string(),
            method: DetectionMethod::BrightObject,
            min_area_px: 20000.0,
            max_area_ratio: 0.65,
            max_aspect: 8.0,
            height_mm: 0.0,
            camera_height_mm: None,
            reject_border_px: 80,
            max_candidates: 6,
            prefer_quad: true,
            quad_epsilon_factors: vec![0.02, 0.03, 0.04, 0.05, 0.07],
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
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Roi {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

// ── Vision Payload Models (Flexisender-compatible) ───────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Point2D {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VisionPayload {
    pub units: String,
    pub coordinate_system: String,
    pub origin: String,
    pub workspace: WorkspaceBounds,
    pub source_image: Option<String>,
    pub detection_roi: Option<DetectionRoi>,
    pub captured_at: String,
    pub objects: Vec<VisionObject>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceBounds {
    pub x_min: f64,
    pub x_max: f64,
    pub y_min: f64,
    pub y_max: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectionRoi {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VisionObject {
    pub id: String,
    #[serde(rename = "type")]
    pub object_type: String,
    pub label: String,
    pub confidence: Option<f64>,
    pub height_mm: f64,
    pub center: Point2D,
    pub outline: Vec<Point2D>,
    pub size_mm: ObjectSize,
    pub workspace_fraction: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ObjectSize {
    pub long: f64,
    pub short: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult {
    pub payload: VisionPayload,
    pub debug_image_base64: Option<String>,
    pub raw_contour_count: usize,
    pub processing_ms: u64,
}

// ── Project Model ────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash, PartialOrd, Ord)]
pub enum WorkflowStep {
    CameraSetup,
    Tramming,
    BoardGeneration,
    IntrinsicsCalibration,
    BedCalibration,
    CalibrationTest,
    Scanning,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Project {
    pub camera_index: Option<i32>,
    pub camera_device_id: Option<String>,
    pub camera_backend: String,
    pub camera_width: i32,
    pub camera_height: i32,
    pub camera_fourcc: String,
    #[serde(default = "default_camera_fps")]
    pub camera_fps: f64,
    /// Keyed by "{backend}:{device_id}:{control_key}"
    pub camera_controls: HashMap<String, i32>,
    /// Keyed by "{backend}:{device_id}:{control_key}"
    pub auto_control_locks: HashMap<String, bool>,
    pub charuco_config: CharucoConfig,
    #[serde(default)]
    pub generated_boards: Vec<GeneratedCharucoBoard>,
    pub intrinsics: Option<CameraIntrinsics>,
    pub bed_transform: Option<BedTransform>,
    pub workspace: WorkspaceDefinition,
    pub detection_profiles: Vec<DetectionProfile>,
    pub active_profile_index: usize,
    pub websocket_port: u16,
    pub websocket_bind_address: String,
    pub scan_interval_secs: f64,
    pub completed_steps: BTreeSet<WorkflowStep>,
    pub show_3d_viewport: bool,
}

impl Default for Project {
    fn default() -> Self {
        Self {
            camera_index: None,
            camera_device_id: None,
            camera_backend: "opencv-dshow".to_string(),
            camera_width: 1920,
            camera_height: 1080,
            camera_fourcc: "MJPG".to_string(),
            camera_fps: default_camera_fps(),
            camera_controls: HashMap::new(),
            auto_control_locks: HashMap::new(),
            charuco_config: CharucoConfig::default(),
            generated_boards: Vec::new(),
            intrinsics: None,
            bed_transform: None,
            workspace: WorkspaceDefinition::default(),
            detection_profiles: vec![DetectionProfile::bright_object_default()],
            active_profile_index: 0,
            websocket_port: 5001,
            websocket_bind_address: "127.0.0.1".to_string(),
            scan_interval_secs: 30.0,
            completed_steps: BTreeSet::new(),
            show_3d_viewport: true,
        }
    }
}

fn default_camera_fps() -> f64 {
    30.0
}

// ── WebSocket Status ─────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebSocketStatus {
    pub running: bool,
    pub port: u16,
    pub bind_address: String,
    pub connected_clients: usize,
}
