use std::sync::Arc;
use tokio::sync::{broadcast, mpsc, oneshot, watch, RwLock};

use crate::models::*;

/// Command sent from async Tauri handlers to the camera thread.
pub enum CameraCommand {
    /// Request a fresh frame; response sent via the oneshot sender.
    CaptureFrame(oneshot::Sender<Result<Vec<u8>, String>>),
    /// Request the current camera controls.
    GetControls(oneshot::Sender<Result<Vec<CameraControl>, String>>),
    /// Set a control value by stable key.
    SetControl { control_key: String, value: i32 },
    /// Set auto-control state by stable key.
    SetAutoControl { control_key: String, enabled: bool },
    /// Re-enable autofocus and restart preview warmup.
    RefreshAutofocus(oneshot::Sender<Result<(), String>>),
    /// Stop the camera thread.
    Stop,
}

/// Handle to the background camera thread.
pub struct CameraThreadHandle {
    pub thread: std::thread::JoinHandle<()>,
    /// Latest JPEG-encoded frame (updated continuously by camera thread).
    pub frame_rx: watch::Receiver<Option<Arc<Vec<u8>>>>,
    /// Send commands to the camera thread.
    pub cmd_tx: mpsc::Sender<CameraCommand>,
}

/// Central application state shared across all Tauri command handlers.
pub struct AppState {
    pub project: RwLock<Project>,
    pub camera: RwLock<Option<CameraThreadHandle>>,
    pub calibration_frames: RwLock<Vec<Vec<u8>>>,
    pub calibration_detections: RwLock<Vec<CalibrationDetectionFrame>>,
    pub intrinsics: RwLock<Option<CameraIntrinsics>>,
    pub bed_transform: RwLock<Option<BedTransform>>,
    pub last_payload: RwLock<Option<VisionPayload>>,
    pub ws_broadcast: broadcast::Sender<String>,
    pub scan_abort: RwLock<Option<tokio::task::JoinHandle<()>>>,
}

impl AppState {
    pub fn new(project: Project) -> Self {
        let (ws_tx, _) = broadcast::channel(16);
        let intrinsics = project.intrinsics.clone();
        let bed_transform = project.bed_transform.clone();

        Self {
            project: RwLock::new(project),
            camera: RwLock::new(None),
            calibration_frames: RwLock::new(Vec::new()),
            calibration_detections: RwLock::new(Vec::new()),
            intrinsics: RwLock::new(intrinsics),
            bed_transform: RwLock::new(bed_transform),
            last_payload: RwLock::new(None),
            ws_broadcast: ws_tx,
            scan_abort: RwLock::new(None),
        }
    }
}
